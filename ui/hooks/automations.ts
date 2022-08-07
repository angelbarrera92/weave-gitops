import { useContext } from "react";
import { useMutation, useQuery } from "react-query";
import { CoreClientContext } from "../contexts/CoreClientContext";
import {
  GetHelmReleaseResponse,
  GetKustomizationResponse,
  ListHelmReleasesResponse,
  ListKustomizationsResponse,
  SyncFluxObjectRequest,
  SyncFluxObjectResponse,
} from "../lib/api/core/core.pb";
import {
  FluxObjectKind,
  HelmRelease,
  Kustomization,
} from "../lib/api/core/types.pb";
import {
  NoNamespace,
  RequestError,
  Syncable,
  MultiRequestError,
} from "../lib/types";

export type Automation = Kustomization & HelmRelease & { kind: FluxObjectKind };

export function useListAutomations(namespace = NoNamespace) {
  const { api } = useContext(CoreClientContext);

  return useQuery<
    { result: Automation[]; errors: MultiRequestError[] },
    RequestError
  >(
    "automations",
    () => {
      const p = [
        api.ListKustomizations({ namespace }),
        api.ListHelmReleases({ namespace }),
      ];

      // The typescript CLI complains about Promise.all,
      // but VSCode does not. Supress the CLI error here.
      // useQuery will still give us the correct types.
      return Promise.all<any>(p).then(
        ([kustRes, helmRes]: [
          ListKustomizationsResponse,
          ListHelmReleasesResponse
        ]) => {
          return {
            result: [
              ...updateArrWithKind(
                kustRes.kustomizations,
                FluxObjectKind.KindKustomization
              ),
              ...updateArrWithKind(
                helmRes.helmReleases,
                FluxObjectKind.KindHelmRelease
              ),
            ],
            errors: [
              ...updateArrWithKind(
                kustRes.errors,
                FluxObjectKind.KindKustomization
              ),
              ...updateArrWithKind(
                helmRes.errors,
                FluxObjectKind.KindHelmRelease
              ),
            ],
          };
        }
      );
    },
    { retry: false, refetchInterval: 5000 }
  );
}

function updateArrWithKind<T>(arr: Array<T>, kind: FluxObjectKind) {
  return arr?.map((k: T) => ({
    ...k,
    kind,
  }));
}
export function useGetKustomization(
  name: string,

  namespace = NoNamespace,
  clusterName: string
) {
  const { api } = useContext(CoreClientContext);

  return useQuery<GetKustomizationResponse, RequestError>(
    ["kustomizations", name],
    () => api.GetKustomization({ name, namespace, clusterName }),
    { retry: false, refetchInterval: 5000 }
  );
}

export function useGetHelmRelease(
  name: string,
  namespace = NoNamespace,
  clusterName = null
) {
  const { api } = useContext(CoreClientContext);

  return useQuery<GetHelmReleaseResponse, RequestError>(
    ["helmrelease", name],
    () => api.GetHelmRelease({ name, namespace, clusterName }),
    { retry: false, refetchInterval: 5000 }
  );
}

export function useSyncFluxObject(obj: Syncable) {
  const { api } = useContext(CoreClientContext);
  const mutation = useMutation<
    SyncFluxObjectResponse,
    RequestError,
    SyncFluxObjectRequest
  >(({ withSource }) => api.SyncFluxObject({ ...obj, withSource }));

  return mutation;
}
