import type { BlogContentLocale } from './blog';
import type { BlogVariantPayload } from './blog-client';

export type BlogPostAuthState = 'checking' | 'required' | 'granted';
export type BlogPostViewState =
  | 'authChecking'
  | 'authRequired'
  | 'ready'
  | 'loadingVariant'
  | 'loadFailed';

export interface BlogPostReducerState {
  requestedContentLocale: BlogContentLocale;
  displayedContentLocale: BlogContentLocale;
  authState: BlogPostAuthState;
  viewState: BlogPostViewState;
  lazyVariants: Partial<Record<BlogContentLocale, BlogVariantPayload>>;
  activeRequestKey: string | null;
  loadingLocale: BlogContentLocale | null;
  errorCode: string | null;
  errorMessage: string;
}

type ResetArticleAction = {
  type: 'resetArticle';
  requestedContentLocale: BlogContentLocale;
  actualContentLocale: BlogContentLocale;
  requiresAuth: boolean;
};

type SetRequestedLocaleAction = {
  type: 'setRequestedLocale';
  locale: BlogContentLocale;
};

type RetryRequestedLocaleAction = {
  type: 'retryRequestedLocale';
};

type AuthResolvedAction = {
  type: 'authResolved';
  granted: boolean;
};

type DisplayCachedLocaleAction = {
  type: 'displayCachedLocale';
  locale: BlogContentLocale;
};

type StartVariantRequestAction = {
  type: 'startVariantRequest';
  requestKey: string;
  locale: BlogContentLocale;
};

type VariantLoadedAction = {
  type: 'variantLoaded';
  requestKey: string;
  locale: BlogContentLocale;
  payload: BlogVariantPayload;
};

type VariantFailedAction = {
  type: 'variantFailed';
  requestKey: string;
  locale: BlogContentLocale;
  code: string;
  message: string;
};

export type BlogPostReducerAction =
  | ResetArticleAction
  | SetRequestedLocaleAction
  | RetryRequestedLocaleAction
  | AuthResolvedAction
  | DisplayCachedLocaleAction
  | StartVariantRequestAction
  | VariantLoadedAction
  | VariantFailedAction;

function resolveViewState(authState: BlogPostAuthState): BlogPostViewState {
  if (authState === 'checking') {
    return 'authChecking';
  }
  if (authState === 'required') {
    return 'authRequired';
  }
  return 'ready';
}

export function createInitialBlogPostState({
  requestedContentLocale,
  actualContentLocale,
  requiresAuth,
}: {
  requestedContentLocale: BlogContentLocale;
  actualContentLocale: BlogContentLocale;
  requiresAuth: boolean;
}): BlogPostReducerState {
  const authState: BlogPostAuthState = requiresAuth ? 'checking' : 'granted';

  return {
    requestedContentLocale,
    displayedContentLocale: actualContentLocale,
    authState,
    viewState: resolveViewState(authState),
    lazyVariants: {},
    activeRequestKey: null,
    loadingLocale: null,
    errorCode: null,
    errorMessage: '',
  };
}

export function shouldSuppressFallbackBanner({
  requestedContentLocale,
  displayedContentLocale,
  actualContentLocale,
}: {
  requestedContentLocale: BlogContentLocale;
  displayedContentLocale: BlogContentLocale;
  actualContentLocale: BlogContentLocale;
}) {
  return (
    displayedContentLocale !== actualContentLocale
    || requestedContentLocale !== actualContentLocale
  );
}

export function blogPostStateReducer(
  state: BlogPostReducerState,
  action: BlogPostReducerAction,
): BlogPostReducerState {
  switch (action.type) {
    case 'resetArticle':
      return createInitialBlogPostState({
        requestedContentLocale: action.requestedContentLocale,
        actualContentLocale: action.actualContentLocale,
        requiresAuth: action.requiresAuth,
      });
    case 'setRequestedLocale':
      return {
        ...state,
        requestedContentLocale: action.locale,
        errorCode: null,
        errorMessage: '',
        viewState:
          state.authState === 'granted'
            ? state.displayedContentLocale === action.locale
              ? 'ready'
              : 'loadingVariant'
            : resolveViewState(state.authState),
      };
    case 'retryRequestedLocale':
      return {
        ...state,
        errorCode: null,
        errorMessage: '',
        viewState: state.authState === 'granted' ? 'loadingVariant' : resolveViewState(state.authState),
      };
    case 'authResolved':
      return {
        ...state,
        authState: action.granted ? 'granted' : 'required',
        viewState:
          action.granted && state.displayedContentLocale === state.requestedContentLocale
            ? 'ready'
            : action.granted
              ? 'loadingVariant'
              : 'authRequired',
        activeRequestKey: action.granted ? state.activeRequestKey : null,
        loadingLocale: action.granted ? state.loadingLocale : null,
        errorCode: null,
        errorMessage: '',
      };
    case 'displayCachedLocale':
      return {
        ...state,
        displayedContentLocale: action.locale,
        viewState: 'ready',
        activeRequestKey: null,
        loadingLocale: null,
        errorCode: null,
        errorMessage: '',
      };
    case 'startVariantRequest':
      return {
        ...state,
        viewState: 'loadingVariant',
        activeRequestKey: action.requestKey,
        loadingLocale: action.locale,
        errorCode: null,
        errorMessage: '',
      };
    case 'variantLoaded':
      if (state.activeRequestKey !== action.requestKey) {
        return state;
      }

      return {
        ...state,
        displayedContentLocale: action.locale,
        viewState: 'ready',
        lazyVariants: {
          ...state.lazyVariants,
          [action.locale]: action.payload,
        },
        activeRequestKey: null,
        loadingLocale: null,
        errorCode: null,
        errorMessage: '',
      };
    case 'variantFailed':
      if (state.activeRequestKey !== action.requestKey) {
        return state;
      }

      if (action.code === 'FORBIDDEN') {
        return {
          ...state,
          authState: 'required',
          viewState: 'authRequired',
          activeRequestKey: null,
          loadingLocale: null,
          errorCode: null,
          errorMessage: '',
        };
      }

      return {
        ...state,
        viewState: 'loadFailed',
        activeRequestKey: null,
        loadingLocale: null,
        errorCode: action.code,
        errorMessage: action.message,
      };
    default:
      return state;
  }
}
