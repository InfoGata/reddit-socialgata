import { MessageType, UiMessageType } from "./shared";

const REDDIT_API_BASE = "https://oauth.reddit.com";
const REDDIT_PUBLIC_API_BASE = "https://www.reddit.com";
const REDDIT_TOKEN_KEY = "reddit_access_token";
const REDDIT_CLIENT_ID_KEY = "reddit_client_id";
const REDDIT_CLIENT_SECRET_KEY = "reddit_client_secret";

type RedditResponse = Listing;

interface Listing {
  kind: "Listing";
  data?: ListingData;
}

interface ListingData {
  after: string;
  before: string | null;
  dist: number;
  children: (ListingChildPost | ListingChildComment | ListingMore)[];
}

interface ListingChildPost {
  kind: "t3";
  data: ListingChildPostData;
}

interface ListingChildComment {
  kind: "t1";
  data: ListingChildCommentData;
}

interface ListingMore {
  kind: "more";
  data: ListingMoreData;
}

interface ListingChildSubreddit {
  kind: "t5";
  data: {
    display_name: string;
    public_description: string;
    subscribers: number;
    url: string;
    title: string;
  };
}

interface ListingMoreData {
  count: number;
  parent_id: string;
  name: string;
  id: string;
  children: string[];
}

interface ListingChildCommentData {
  author: string;
  body: string;
  body_html: string;
  created: number;
  created_utc: number;
  depth: number;
  score: number;
  is_submitter: boolean;
  distinguished: string | null;
  stickied: boolean;
  edited: boolean | number;
  replies?: Listing;
  id: string;
}

interface ListingChildPostData {
  approved_at_utc: string | null;
  subreddit: string;
  selftext: string;
  author_fullname: string;
  saved: boolean;
  mod_reason_title: string | null;
  gilded: number;
  clicked: boolean;
  title: string;
  name: string;
  created: number;
  link_flair_richtext: Array<string>;
  subreddit_name_prefixed: string;
  hidden: boolean;
  pwls: number;
  link_flair_css_class: boolean;
  downs: number;
  thumbnail_height: boolean;
  top_awarded_type: boolean;
  hide_score: boolean;
  quarantine: boolean;
  link_flair_text_color: string;
  upvote_ratio: number;
  author_flair_background_color: string | null;
  subreddit_type: string;
  ups: number;
  total_awards_received: number;
  media_embed: object;
  thumbnail_width: number | null;
  author_flair_template_id: string | null;
  is_original_content: boolean;
  user_reports: Array<string>;
  secure_media: RedditMedia | null;
  is_reddit_media_domain: boolean;
  is_meta: boolean;
  category: string | null;
  secure_media_embed: object;
  link_flair_text: string | null;
  can_mod_post: boolean;
  score: number;
  approved_by: string | null;
  is_created_from_ads_ui: boolean;
  author_premium: boolean;
  thumbnail: string;
  edited: boolean;
  author_flair_css_class: string | null;
  author_flair_richtext: Array<string>;
  gildings: object;
  content_categories: string | null;
  is_self: boolean;
  mod_note: string | null;
  link_flair_type: string;
  wls: number;
  removed_by_category: string | null;
  banned_by: string | null;
  author_flair_type: string;
  domain: string;
  allow_live_comments: boolean;
  selftext_html: string;
  likes: string | null;
  suggested_sort: string | null;
  banned_at_utc: string | null;
  view_count: string | null;
  archived: boolean;
  no_follow: boolean;
  is_crosspostable: boolean;
  pinned: boolean;
  over_18: boolean;
  all_awardings: Array<string>;
  awarders: Array<string>;
  media_only: boolean;
  can_gild: boolean;
  spoiler: boolean;
  locked: boolean;
  author_flair_text: string | null;
  treatment_tags: Array<string>;
  visited: boolean;
  removed_by: string | null;
  num_reports: string | null;
  distinguished: string | null;
  subreddit_id: string;
  author_is_blocked: boolean;
  mod_reason_by: string | null;
  removal_reason: string | null;
  link_flair_background_color: string;
  id: string;
  is_robot_indexable: boolean;
  report_reasons: string | null;
  author: string;
  discussion_type: string | null;
  num_comments: number;
  send_replies: boolean;
  whitelist_status: string;
  contest_mode: boolean;
  mod_reports: Array<string>;
  author_patreon_flair: boolean;
  author_flair_text_color: string | null;
  permalink: string;
  parent_whitelist_status: string;
  stickied: boolean;
  url: string;
  subreddit_subscribers: number;
  created_utc: number;
  num_crossposts: number;
  media: RedditMedia | null;
  is_video: boolean;
  post_hint?: string;
  crosspost_parent_list?: ListingChildPostData[];
  preview?: Preview;
}

interface RedditMedia {
  reddit_video?: RedditVideo;
  /** Host of an embedded player, e.g. "redgifs.com", "youtube.com" */
  type?: string;
}

interface RedditVideo {
  bitrate_kbps: number;
  /** mp4, but VIDEO ONLY unless is_gif — audio lives in a separate DASH track */
  fallback_url: string;
  has_audio?: boolean;
  height: number;
  width: number;
  scrubber_media_url: string;
  dash_url: string;
  duration: number;
  hls_url: string;
  is_gif: boolean;
  transcoding_status: string;
}

interface Preview {
  enabled: boolean;
  images: PreviewImage[];
  /** Reddit-hosted rehost of a linked-out clip (redgifs, gfycat, ...) */
  reddit_video_preview?: RedditVideo;
}

interface PreviewImage {
  source: {
    url: string;
    width: number;
    height: number;
  };
  resolutions: PreviewImageResolution[];
}

interface PreviewImageResolution {
  url: string;
  width: number;
  height: number;
}

interface CommentsResponse {
  0: { kind: "Listing"; data: { children: ListingChildPost[] } };
  1: Listing;
}

interface UserResponse {
  kind: "Listing";
  data: ListingData;
}

// Sort configuration
const TIME_RANGES: TimeRange[] = [
  { id: "hour", displayName: "Now" },
  { id: "day", displayName: "Today" },
  { id: "week", displayName: "This Week" },
  { id: "month", displayName: "This Month" },
  { id: "year", displayName: "This Year" },
  { id: "all", displayName: "All Time" },
];

const LISTING_SORTS: SortOption[] = [
  { id: "hot", displayName: "Hot" },
  { id: "new", displayName: "New" },
  {
    id: "top",
    displayName: "Top",
    timeRanges: TIME_RANGES,
    defaultTimeRangeId: "day",
  },
  { id: "rising", displayName: "Rising" },
  {
    id: "controversial",
    displayName: "Controversial",
    timeRanges: TIME_RANGES,
    defaultTimeRangeId: "day",
  },
];

// Reddit user overviews don't support the "rising" sort.
const USER_SORTS: SortOption[] = LISTING_SORTS.filter((s) => s.id !== "rising");

/**
 * Search has its own sort vocabulary, distinct from the listing sorts, and
 * every one of them accepts a time range. Defaults to all-time so a query
 * isn't silently narrowed to the last day.
 */
const SEARCH_SORTS: SortOption[] = [
  {
    id: "relevance",
    displayName: "Relevance",
    timeRanges: TIME_RANGES,
    defaultTimeRangeId: "all",
  },
  {
    id: "hot",
    displayName: "Hot",
    timeRanges: TIME_RANGES,
    defaultTimeRangeId: "all",
  },
  {
    id: "top",
    displayName: "Top",
    timeRanges: TIME_RANGES,
    defaultTimeRangeId: "all",
  },
  {
    id: "new",
    displayName: "New",
    timeRanges: TIME_RANGES,
    defaultTimeRangeId: "all",
  },
  {
    id: "comments",
    displayName: "Most Comments",
    timeRanges: TIME_RANGES,
    defaultTimeRangeId: "all",
  },
];

/**
 * Resolves a requested sort/time-range against the available options, falling
 * back to safe defaults so a bad/missing url param can't build an invalid
 * Reddit path. Returns the chosen sort plus the time range id to apply (only
 * defined when the sort declares time ranges).
 */
const resolveSort = (
  options: SortOption[],
  sortId?: string,
  timeRangeId?: string
): { sort: SortOption; timeRangeId?: string } => {
  const sort = options.find((s) => s.id === sortId) ?? options[0];
  if (!sort.timeRanges) {
    return { sort, timeRangeId: undefined };
  }
  const resolvedTimeRangeId =
    sort.timeRanges.find((t) => t.id === timeRangeId)?.id ??
    sort.defaultTimeRangeId ??
    sort.timeRanges[0]?.id;
  return { sort, timeRangeId: resolvedTimeRangeId };
};

// State
let accessToken = localStorage.getItem(REDDIT_TOKEN_KEY) || "";

/**
 * Every Reddit API read goes through here. `raw_json=1` stops Reddit
 * HTML-escaping urls in its JSON, which otherwise corrupts the signed query
 * params on `hls_url`/`dash_url` (`&` arriving as `&amp;`).
 */
const httpRequest = async (url: string, init?: RequestInit) => {
  const requestUrl = new URL(url);
  requestUrl.searchParams.set("raw_json", "1");
  const finalUrl = requestUrl.toString();
  if (await application.isNetworkRequestCorsDisabled()) {
    return application.networkRequest(finalUrl, init);
  }
  return fetch(finalUrl, init);
};

/**
 * Decodes HTML entities in URLs (e.g., &amp; -> &)
 * Reddit API sometimes returns URLs with HTML-encoded ampersands which break image loading
 */
const decodeHtmlEntities = (url: string | undefined): string | undefined => {
  if (!url) return url;
  const textarea = document.createElement("textarea");
  textarea.innerHTML = url;
  return textarea.value;
};

/**
 * Checks if a string is a valid URL
 */
const isValidUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  return url.startsWith("http://") || url.startsWith("https://");
};

/**
 * Placeholder image for non-URL thumbnails (spoiler, default, nsfw, etc.)
 */
const PLACEHOLDER_THUMBNAIL =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 140 140"%3E%3Crect width="140" height="140" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="16" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';

const HLS_TYPE = "application/x-mpegURL";

/**
 * Reddit's `fallback_url` mp4 carries no audio track (audio is a separate DASH
 * representation), so HLS is the only single-url source that plays with sound.
 * The mp4 is still worth emitting as a silent last resort.
 */
const redditVideoToSources = (video: RedditVideo): VideoSource[] => {
  const sources: VideoSource[] = [];
  const hls = decodeHtmlEntities(video.hls_url);
  const fallback = decodeHtmlEntities(video.fallback_url);

  if (video.is_gif) {
    // No audio track exists at all, so the mp4 loses nothing and avoids hls.js.
    if (fallback) sources.push({ source: fallback, type: "video/mp4" });
    if (hls) sources.push({ source: hls, type: HLS_TYPE });
  } else {
    if (hls) sources.push({ source: hls, type: HLS_TYPE });
    if (fallback) sources.push({ source: fallback, type: "video/mp4" });
  }
  return sources;
};

const getVideoSources = (post: ListingChildPostData): VideoSource[] => {
  const redditVideo =
    post.secure_media?.reddit_video ??
    post.media?.reddit_video ??
    post.crosspost_parent_list?.[0]?.secure_media?.reddit_video ??
    post.preview?.reddit_video_preview;
  if (redditVideo) return redditVideoToSources(redditVideo);

  const url = decodeHtmlEntities(post.url);
  if (!url) return [];
  // Imgur .gifv is an mp4 wearing a costume.
  if (/\.gifv(\?|$)/i.test(url)) {
    return [{ source: url.replace(/\.gifv/i, ".mp4"), type: "video/mp4" }];
  }
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) {
    return [
      { source: url, type: /\.webm/i.test(url) ? "video/webm" : "video/mp4" },
    ];
  }
  return [];
};

/**
 * Poster frame for a video post. Prefers the largest preview no wider than
 * 640px, since `post.thumbnail` is a ~140px crop that looks bad blown up.
 */
const getVideoThumbnail = (
  post: ListingChildPostData
): string | undefined => {
  const image = post.preview?.images[0];
  const best = image?.resolutions
    ?.filter((r) => r.width <= 640)
    .sort((a, b) => b.width - a.width)[0];
  return best?.url ?? image?.source?.url ?? post.thumbnail;
};

const hasLogin = () => {
  return !!accessToken;
};

const getBaseUrl = () => {
  if (hasLogin()) {
    return REDDIT_API_BASE;
  } else {
    return REDDIT_PUBLIC_API_BASE;
  }
};

const getHeaders = (): HeadersInit => {
  const headers: HeadersInit = {};
  if (hasLogin()) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }
  return headers;
};

const redditPostsToPost = (post: ListingChildPostData): Post => {
  const videoSources = getVideoSources(post);
  const isVideo = post.is_video || videoSources.length > 0;
  const thumbnailUrl = isVideo ? getVideoThumbnail(post) : post.thumbnail;
  const decodedThumbnail = decodeHtmlEntities(thumbnailUrl);

  return {
    apiId: post.id,
    title: post.title,
    numOfComments: post.num_comments,
    score: post.score,
    // With raw_json=1 Reddit returns `selftext_html` as real (unescaped) HTML,
    // which the app renders directly. Fall back to the raw markdown otherwise.
    body: post.selftext_html || post.selftext,
    publishedDate: post.created_utc
      ? new Date(post.created_utc * 1000).toISOString()
      : undefined,
    authorName: post.author,
    authorApiId: post.author,
    communityName: post.subreddit,
    communityApiId: post.subreddit,
    thumbnailUrl:
      post.thumbnail === "self"
        ? undefined
        : isValidUrl(decodedThumbnail)
        ? decodedThumbnail
        : PLACEHOLDER_THUMBNAIL,
    url: post.thumbnail === "self" ? undefined : decodeHtmlEntities(post.url),
    originalUrl: `${REDDIT_PUBLIC_API_BASE}${post.permalink}`,
    isVideo,
    videoSources: videoSources.length > 0 ? videoSources : undefined,
    flair: post.link_flair_text || undefined,
    upvoteRatio: post.upvote_ratio,
    nsfw: post.over_18 || undefined,
    spoiler: post.spoiler || undefined,
    locked: post.locked || undefined,
    stickied: post.stickied || undefined,
    edited: post.edited ? true : undefined,
    distinguished: post.distinguished || undefined,
  };
};

const redditCommentToPost = (comment: ListingChildCommentData): Post => {
  return {
    apiId: comment.id,
    // `body_html` is real HTML with raw_json=1; fall back to markdown otherwise.
    body: comment.body_html || comment.body,
    authorName: comment.author,
    authorApiId: comment.author,
    score: comment.score,
    publishedDate: comment.created_utc
      ? new Date(comment.created_utc * 1000).toISOString()
      : undefined,
    isSubmitter: comment.is_submitter || undefined,
    distinguished: comment.distinguished || undefined,
    stickied: comment.stickied || undefined,
    edited: comment.edited ? true : undefined,
    comments:
      comment.replies?.data?.children
        .filter((c): c is ListingChildComment => c.kind === "t1")
        .map((c) => redditCommentToPost(c.data)) ?? [],
    moreRepliesId: comment.replies?.data?.children.find(
      (c): c is ListingMore => c.kind === "more"
    )?.data?.id,
    moreRepliesCount: comment.replies?.data?.children.find(
      (c): c is ListingMore => c.kind === "more"
    )?.data?.count,
  };
};

/**
 * Fetches a Reddit post listing and maps it to items + pagination. Every post
 * listing endpoint (front page, subreddit, search) returns the same envelope,
 * so callers only have to build the url.
 */
const fetchPostListing = async (
  url: URL
): Promise<{ items: Post[]; pageInfo: PageInfo }> => {
  const response = await httpRequest(url.toString(), {
    headers: getHeaders(),
  });
  const json: RedditResponse = await response.json();
  return {
    items:
      json.data?.children
        .filter((c): c is ListingChildPost => c.kind === "t3")
        .map((c) => redditPostsToPost(c.data)) ?? [],
    pageInfo: {
      nextPage: json.data?.after ?? undefined,
      prevPage: json.data?.before ?? undefined,
    },
  };
};

// Plugin Methods

/**
 * Front-page listings. "Home" is the logged-in user's subscribed feed and is
 * only meaningful with a login; "Popular"/"All" are the public listings. The
 * id maps to the Reddit path prefix the sort is appended to.
 */
const FEED_LISTING_PREFIXES: Record<string, string> = {
  home: "",
  popular: "/r/popular",
  all: "/r/all",
};

const getFeedTypes = (): FeedType[] => {
  const types: FeedType[] = [
    { id: "popular", displayName: "Popular" },
    { id: "all", displayName: "All" },
  ];
  if (hasLogin()) {
    types.unshift({ id: "home", displayName: "Home" });
  }
  return types;
};

const getFeed = async (request?: GetFeedRequest): Promise<GetFeedResponse> => {
  const baseUrl = getBaseUrl();

  const feedTypes = getFeedTypes();
  const feedTypeId =
    feedTypes.find((f) => f.id === request?.feedTypeId)?.id ?? feedTypes[0].id;
  const prefix = FEED_LISTING_PREFIXES[feedTypeId] ?? "";

  const { sort, timeRangeId } = resolveSort(
    LISTING_SORTS,
    request?.sortId,
    request?.timeRangeId
  );

  // Build URL with pagination + sort parameters
  const url = new URL(`${baseUrl}${prefix}/${sort.id}.json`);
  if (request?.pageInfo?.page) {
    url.searchParams.append("after", String(request.pageInfo.page));
  }
  if (timeRangeId) {
    url.searchParams.append("t", timeRangeId);
  }

  const { items, pageInfo } = await fetchPostListing(url);

  items.forEach((item, index) => {
    item.number =
      (Number(request?.pageInfo?.page ?? "1") - 1) * 25 + index + 1;
  });

  return {
    items,
    pageInfo,
    feedTypes,
    feedTypeId,
    sortOptions: LISTING_SORTS,
    sortId: sort.id,
    timeRangeId,
  };
};

const getCommunity = async (
  request: GetCommunityRequest
): Promise<GetCommunityResponse> => {
  const baseUrl = getBaseUrl();

  const { sort, timeRangeId } = resolveSort(
    LISTING_SORTS,
    request.sortId,
    request.timeRangeId
  );
  const path = `/r/${request.apiId}/${sort.id}.json`;

  const url = new URL(`${baseUrl}${path}`);
  if (request.pageInfo?.page) {
    url.searchParams.append("after", String(request.pageInfo.page));
  }
  if (timeRangeId) {
    url.searchParams.append("t", timeRangeId);
  }

  return {
    ...(await fetchPostListing(url)),
    sortOptions: LISTING_SORTS,
    sortId: sort.id,
    timeRangeId,
  };
};

/**
 * Searches within a single subreddit. `restrict_sr=1` is what keeps results
 * scoped to it — without it Reddit widens the search to the whole site.
 */
const searchCommunity = async (
  request: SearchCommunityRequest
): Promise<SearchCommunityResponse> => {
  const { sort, timeRangeId } = resolveSort(
    SEARCH_SORTS,
    request.sortId,
    request.timeRangeId
  );

  const url = new URL(
    `${getBaseUrl()}/r/${request.communityApiId}/search.json`
  );
  url.searchParams.append("q", request.query);
  url.searchParams.append("restrict_sr", "1");
  url.searchParams.append("type", "link");
  url.searchParams.append("sort", sort.id);
  if (timeRangeId) {
    url.searchParams.append("t", timeRangeId);
  }
  if (request.pageInfo?.page) {
    url.searchParams.append("after", String(request.pageInfo.page));
  }

  return {
    ...(await fetchPostListing(url)),
    sortOptions: SEARCH_SORTS,
    sortId: sort.id,
    timeRangeId,
  };
};

const getComments = async (
  request: GetCommentsRequest
): Promise<GetCommentsResponse> => {
  const headers = getHeaders();
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/r/${request.communityId}/comments/${request.apiId}.json`;
  const response = await httpRequest(url, {
    headers,
  });
  const json: CommentsResponse = await response.json();
  const items =
    json[1].data?.children
      .filter((c): c is ListingChildComment => c.kind === "t1")
      .map((c) => redditCommentToPost(c.data)) ?? [];
  const post = json[0].data.children
    .filter((c): c is ListingChildPost => c.kind === "t3")
    .map((c) => redditPostsToPost(c.data))[0];
  const more = json[1].data?.children.find(
    (c): c is ListingMore => c.kind === "more"
  )?.data;
  post.moreRepliesId = more?.id;
  post.moreRepliesCount = more?.count;

  return {
    items,
    post,
  };
};

const getUser = async (request: GetUserRequest): Promise<GetUserResponse> => {
  const headers = getHeaders();
  const baseUrl = getBaseUrl();

  const { sort, timeRangeId } = resolveSort(
    USER_SORTS,
    request.sortId,
    request.timeRangeId
  );
  const url = new URL(`${baseUrl}/user/${request.apiId}/overview.json`);
  url.searchParams.append("sort", sort.id);
  if (timeRangeId) {
    url.searchParams.append("t", timeRangeId);
  }

  const response = await httpRequest(url.toString(), {
    headers,
  });
  const json: UserResponse = await response.json();
  const items = json.data.children.map((c): Post => {
    if (c.kind === "t1") return redditCommentToPost(c.data);
    if (c.kind === "t3") return redditPostsToPost(c.data);
    throw new Error(`Unexpected kind: ${c.kind}`);
  });
  return {
    items,
    sortOptions: USER_SORTS,
    sortId: sort.id,
    timeRangeId,
  };
};

const getCommunities = async (
  request: GetCommunitiesRequest
): Promise<GetCommunitiesResponse> => {
  const headers = getHeaders();
  const baseUrl = getBaseUrl();
  const url = new URL(`${baseUrl}/subreddits/popular.json`);
  if (request?.pageInfo?.page) {
    url.searchParams.append("after", String(request.pageInfo.page));
  }

  const response = await httpRequest(url.toString(), {
    headers,
  });
  const json = await response.json();
  const items =
    json.data?.children
      .filter((c: ListingChildSubreddit) => c.kind === "t5")
      .map((c: ListingChildSubreddit) => ({
        apiId: c.data.display_name,
        name: c.data.display_name,
        description: c.data.public_description,
        originalUrl: `https://www.reddit.com${c.data.url}`,
      })) ?? [];

  return {
    items,
    pageInfo: {
      nextPage: json.data?.after ?? undefined,
      prevPage: json.data?.before ?? undefined,
    },
  };
};

const search = async (request: SearchRequest): Promise<SearchResponse> => {
  const baseUrl = getBaseUrl();
  const path = "/search.json";

  const url = new URL(`${baseUrl}${path}`);
  url.searchParams.append("q", request.query);
  url.searchParams.append("type", "link");
  if (request.pageInfo?.page) {
    url.searchParams.append("after", String(request.pageInfo.page));
  }

  return fetchPostListing(url);
};

const login = async (request: LoginRequest): Promise<void> => {
  const tokenUrl = "https://www.reddit.com/api/v1/access_token";
  const redirectUri = `${window.location.origin}/login_popup.html`;
  const authUrl = "https://www.reddit.com/api/v1/authorize";
  const responseType = "code";
  const state = "12345";
  const scope = "read history";
  const duration = "permanent";

  const url = new URL(authUrl);
  url.searchParams.append("redirect_uri", redirectUri);
  url.searchParams.append("client_id", request.apiKey);
  url.searchParams.append("state", state);
  url.searchParams.append("response_type", responseType);
  url.searchParams.append("duration", duration);
  url.searchParams.append("scope", scope);

  const newWindow = window.open(url);

  return new Promise((resolve) => {
    const onMessage = async (returnUrl: string) => {
      const codeUrl = new URL(returnUrl);
      const code = codeUrl.searchParams.get("code");
      if (code) {
        const auth = btoa(`${request.apiKey}:${request.apiSecret}`);
        const params = new URLSearchParams();
        params.append("code", code);
        params.append("grant_type", "authorization_code");
        params.append("redirect_uri", redirectUri);
        const response = await fetch(tokenUrl, {
          method: "POST",
          body: params.toString(),
          headers: {
            "Content-type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${auth}`,
          },
        });
        const json = await response.json();
        accessToken = json.access_token;
        localStorage.setItem(REDDIT_TOKEN_KEY, json.access_token);
        resolve();
      }
      if (newWindow) {
        newWindow.close();
      }
    };

    window.onmessage = (event: MessageEvent) => {
      if (event.source === newWindow) {
        onMessage(event.data.url);
      }
    };
  });
};

const logout = async (): Promise<void> => {
  accessToken = "";
  localStorage.removeItem(REDDIT_TOKEN_KEY);
};

const isLoggedIn = async (): Promise<boolean> => {
  return hasLogin();
};

// UI Message handling
const sendMessage = (message: MessageType) => {
  application.postUiMessage(message);
};

const getInfo = async () => {
  const clientId = localStorage.getItem(REDDIT_CLIENT_ID_KEY) || "";
  const clientSecret = localStorage.getItem(REDDIT_CLIENT_SECRET_KEY) || "";
  sendMessage({
    type: "info",
    clientId,
    clientSecret,
    isLoggedIn: hasLogin(),
  });
};

// Theme handling
const changeTheme = (theme: Theme) => {
  localStorage.setItem("vite-ui-theme", theme);
};

// Initialize plugin
const init = async () => {
  const token = localStorage.getItem(REDDIT_TOKEN_KEY);
  if (token) {
    accessToken = token;
  }

  const theme = await application.getTheme();
  changeTheme(theme);
};

// Wire up plugin handlers
application.onGetFeed = getFeed;
application.onGetCommunity = getCommunity;
application.onGetCommunities = getCommunities;
application.onGetComments = getComments;
application.onGetUser = getUser;
application.onSearch = search;
application.onSearchCommunity = searchCommunity;
application.onLogin = login;
application.onLogout = logout;
application.onIsLoggedIn = isLoggedIn;
application.onGetPlatformType = async () => "forum";

application.onUiMessage = async (message: UiMessageType) => {
  switch (message.type) {
    case "check-login":
      getInfo();
      break;
    case "save":
      localStorage.setItem(REDDIT_CLIENT_ID_KEY, message.clientId);
      localStorage.setItem(REDDIT_CLIENT_SECRET_KEY, message.clientSecret);
      application.createNotification({ message: "Settings saved!" });
      break;
    default:
      const _exhaustive: never = message;
      break;
  }
};

application.onChangeTheme = async (theme: Theme) => {
  changeTheme(theme);
};

application.onPostLogin = init;
init();
