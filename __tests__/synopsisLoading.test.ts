import {shouldShowSynopsisSkeleton} from '../src/lib/synopsisLoading';

const settledState = {
  enhancedSynopsis: undefined,
  providerSynopsis: undefined,
  infoLoading: false,
  infoFetching: false,
  metaLoading: false,
  metaFetching: false,
};

describe('shouldShowSynopsisSkeleton', () => {
  it.each([
    ['provider info is loading', {infoLoading: true}],
    ['cached provider info is refreshing', {infoFetching: true}],
    ['enhanced metadata is loading', {metaLoading: true}],
    ['enhanced metadata is refreshing', {metaFetching: true}],
  ])('keeps the skeleton while %s', (_label, loadingState) => {
    expect(shouldShowSynopsisSkeleton({...settledState, ...loadingState})).toBe(
      true,
    );
  });

  it('hides the skeleton as soon as either source has a synopsis', () => {
    expect(
      shouldShowSynopsisSkeleton({
        ...settledState,
        infoFetching: true,
        providerSynopsis: 'Provider synopsis',
      }),
    ).toBe(false);
    expect(
      shouldShowSynopsisSkeleton({
        ...settledState,
        metaFetching: true,
        enhancedSynopsis: 'Enhanced synopsis',
      }),
    ).toBe(false);
  });

  it('allows the empty fallback only after every source settles', () => {
    expect(shouldShowSynopsisSkeleton(settledState)).toBe(false);
  });
});
