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
      // 鉴权状态翻转视为「请求簿记的边界事件」：清掉 activeRequestKey / loadingLocale。
      // 否则在「public → 已授权 protected」跳转中会出现：stale render 里 state.authState
      // 还是 'granted'（旧文章遗留），variant-fetch effect 立刻发起 post-variant 并把
      // activeRequestKey 写成 X；下一帧 resetArticle 把 authState 拉回 'checking' 并
      // abort 该请求，但 X 留在 state 里；grant-check 完成后这里若仍保留 X，effect 会
      // 因 dedup 命中而 early-return，永远不再发请求 —— 页面卡在「正在解码」。
      return {
        ...state,
        authState: action.granted ? 'granted' : 'required',
        viewState:
          action.granted && state.displayedContentLocale === state.requestedContentLocale
            ? 'ready'
            : action.granted
              ? 'loadingVariant'
              : 'authRequired',
        activeRequestKey: null,
        loadingLocale: null,
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
