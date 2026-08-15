export const shouldShowSynopsisSkeleton = ({
  enhancedSynopsis,
  providerSynopsis,
  infoLoading,
  infoFetching,
  metaLoading,
  metaFetching,
}: {
  enhancedSynopsis?: string;
  providerSynopsis?: string;
  infoLoading: boolean;
  infoFetching: boolean;
  metaLoading: boolean;
  metaFetching: boolean;
}): boolean =>
  !enhancedSynopsis &&
  !providerSynopsis &&
  (infoLoading || infoFetching || metaLoading || metaFetching);
