import { MessageType, UiMessageType } from "./shared";
import { PluginRequestError, isPluginErrorLike, sanitizeUrl } from "./errors";
import { hostAllowsNsfw } from "./lib/nsfw";
import {
  GalleryItem,
  IMAGE_URL_REGEX,
  MediaMetadataEntry,
  decodeHtmlEntities,
  embedMedia,
  galleryImages,
  isValidUrl,
  largestUnder,
} from "./media";

const REDDIT_API_BASE = "https://oauth.reddit.com";
const REDDIT_PUBLIC_API_BASE = "https://www.reddit.com";
const REDDIT_TOKEN_KEY = "reddit_access_token";
const REDDIT_CLIENT_ID_KEY = "reddit_client_id";
const REDDIT_CLIENT_SECRET_KEY = "reddit_client_secret";
const REDDIT_NSFW_SEARCH_KEY = "reddit_include_nsfw_search";

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
    over_18?: boolean;
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
  /** Path to the comment on reddit, e.g. `/r/sub/comments/<post>/<slug>/<id>/` */
  permalink?: string;
  subreddit?: string;
  /** Fullname of the post the comment belongs to, e.g. `t3_1mvyt0v` */
  link_id?: string;
  /** Fullname of the parent comment or post */
  parent_id?: string;
  /** Images/gifs embedded in the body, referenced from `body`/`body_html`. */
  media_metadata?: Record<string, MediaMetadataEntry>;
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
  is_gallery?: boolean;
  gallery_data?: GalleryData;
  media_metadata?: Record<string, MediaMetadataEntry>;
}

interface GalleryData {
  items: GalleryItem[];
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
 * Comments have their own sort vocabulary and, unlike the listing sorts, none
 * of them accept a time range. "confidence" is Reddit's id for what the site
 * labels "Best", and is the fallback default.
 */
const COMMENT_SORTS: SortOption[] = [
  { id: "confidence", displayName: "Best" },
  { id: "top", displayName: "Top" },
  { id: "new", displayName: "New" },
  { id: "controversial", displayName: "Controversial" },
  { id: "old", displayName: "Old" },
  { id: "qa", displayName: "Q&A" },
];

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
 * Reasons Reddit gives for a 403 that mean "you may not have this", as opposed
 * to "we don't think you're a browser".
 */
const FORBIDDEN_REASONS = ["private", "quarantined", "banned", "gold_only"];

/**
 * Turns a failed response into an error the app can explain. The 403 split is
 * the important part: Reddit answers 403 both for a private subreddit and for a
 * request carrying no session cookies, and only the second is worth telling
 * someone to go open reddit.com about.
 */
const responseError = async (
  response: Response,
  url: string
): Promise<PluginRequestError> => {
  const status = response.status;
  const requestUrl = sanitizeUrl(url);

  if (status === 403) {
    // Truncated, and never shown to the user: a block page is a whole HTML
    // document.
    const body = await response.text().catch(() => "");
    let reason: string | undefined;
    try {
      reason = JSON.parse(body.slice(0, 512))?.reason;
    } catch {
      // An HTML block page, which is itself the signal that we were refused.
    }
    if (reason && FORBIDDEN_REASONS.includes(reason)) {
      return new PluginRequestError({
        code: "forbidden",
        message: `Reddit says this is ${reason}.`,
        status,
        requestUrl,
        detail: reason,
      });
    }
    return new PluginRequestError({
      code: "blocked",
      message:
        "Reddit refused the request (403). Reddit blocks requests that don't carry a browser session.",
      status,
      requestUrl,
    });
  }

  const code =
    status === 429
      ? "rate-limited"
      : status === 401
        ? "unauthorized"
        : status === 404
          ? "not-found"
          : status >= 500
            ? "server-error"
            : "unknown";
  return new PluginRequestError({
    code,
    message:
      code === "unauthorized" && hasLogin()
        ? "Reddit rejected the saved login. Reconnect it in this plugin's options."
        : `Reddit returned ${status} ${response.statusText}`.trim(),
    status,
    requestUrl,
  });
};

/**
 * Every Reddit API read goes through here, which makes it the one place status
 * has to be checked. `raw_json=1` stops Reddit HTML-escaping urls in its JSON,
 * which otherwise corrupts the signed query params on `hls_url`/`dash_url`
 * (`&` arriving as `&amp;`).
 */
const httpRequest = async (url: string, init?: RequestInit) => {
  const requestUrl = new URL(url);
  requestUrl.searchParams.set("raw_json", "1");
  const finalUrl = requestUrl.toString();

  let response: Response;
  try {
    response = (await application.isNetworkRequestCorsDisabled())
      ? await application.networkRequest(finalUrl, init)
      : await fetch(finalUrl, init);
  } catch (error) {
    // The host classifies its own failures; anything else never reached Reddit.
    if (isPluginErrorLike(error)) throw error;
    throw new PluginRequestError({
      code: "network-error",
      message:
        error instanceof Error && error.message
          ? error.message
          : "The request to Reddit could not be made.",
      requestUrl: sanitizeUrl(finalUrl),
    });
  }

  if (!response.ok) {
    throw await responseError(response, finalUrl);
  }
  return response;
};

/**
 * Reddit serves HTML for block and challenge pages, so a parse failure here is
 * a report about the response, not a bug.
 */
const readJson = async <T>(response: Response, url: string): Promise<T> => {
  try {
    return (await response.json()) as T;
  } catch {
    throw new PluginRequestError({
      code: "invalid-response",
      message: "Reddit's response could not be read as JSON.",
      status: response.status,
      requestUrl: sanitizeUrl(url),
    });
  }
};

/** A 2xx whose body wasn't the shape this plugin knows how to read. */
const unexpectedShape = (url: string) =>
  new PluginRequestError({
    code: "invalid-response",
    message: "Reddit returned something this plugin didn't understand.",
    requestUrl: sanitizeUrl(url),
  });

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

/** Reddit-generated previews. Present for images, links and videos alike. */
const getPreviewImage = (post: ListingChildPostData): string | undefined => {
  const image = post.preview?.images[0];
  if (!image) return undefined;
  return largestUnder(image.resolutions, (r) => r.width)?.url ?? image.source?.url;
};

/**
 * Galleries carry no `preview` at all — their images only exist in
 * `media_metadata`, keyed by the ids listed in `gallery_data`.
 *
 * A crosspost of a gallery has no `gallery_data` of its own, the same way it
 * has no `reddit_video`, so the parent is the fallback here as it is in
 * {@link getVideoSources}.
 */
const getGalleryImages = (post: ListingChildPostData): PostImage[] => {
  const source = post.gallery_data?.items?.length
    ? post
    : post.crosspost_parent_list?.[0];
  return galleryImages(source?.gallery_data?.items, source?.media_metadata);
};

/**
 * `post.thumbnail` is only sometimes a url; for most posts it's a keyword
 * ("image", "default", "self", "nsfw", "spoiler") even when the listing carries
 * full image urls elsewhere. So it's the last resort, not the first.
 */
const getThumbnailUrl = (
  post: ListingChildPostData,
  images: PostImage[]
): string | undefined => {
  const url =
    getPreviewImage(post) ??
    images[0]?.url ??
    (IMAGE_URL_REGEX.test(post.url) ? post.url : undefined) ??
    (isValidUrl(post.thumbnail) ? post.thumbnail : undefined);
  return decodeHtmlEntities(url);
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
  const images = getGalleryImages(post);
  // A text post's `url` is its own permalink, which would make the title link
  // bounce out to Reddit instead of opening the post in the app.
  const isSelfPost = post.is_self || post.thumbnail === "self";

  return {
    apiId: post.id,
    title: post.title,
    numOfComments: post.num_comments,
    score: post.score,
    // With raw_json=1 Reddit returns `selftext_html` as real (unescaped) HTML,
    // which the app renders directly. Fall back to the raw markdown otherwise.
    body:
      embedMedia(post.selftext_html, post.selftext, post.media_metadata) ||
      post.selftext,
    publishedDate: post.created_utc
      ? new Date(post.created_utc * 1000).toISOString()
      : undefined,
    authorName: post.author,
    authorApiId: post.author,
    communityName: post.subreddit,
    communityApiId: post.subreddit,
    thumbnailUrl: getThumbnailUrl(post, images),
    url: isSelfPost ? undefined : decodeHtmlEntities(post.url),
    originalUrl: `${REDDIT_PUBLIC_API_BASE}${post.permalink}`,
    isVideo,
    videoSources: videoSources.length > 0 ? videoSources : undefined,
    images: images.length > 0 ? images : undefined,
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
    body:
      embedMedia(comment.body_html, comment.body, comment.media_metadata) ||
      comment.body,
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
    communityName: comment.subreddit,
    communityApiId: comment.subreddit,
    // Reddit's own comment permalink: the post page focused on this comment.
    originalUrl: comment.permalink
      ? `${REDDIT_PUBLIC_API_BASE}${comment.permalink}`
      : undefined,
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
  const json = await readJson<RedditResponse>(response, url.toString());
  // No listing envelope at all means we were served something else — a block
  // page, an error document. Reporting that beats rendering an empty feed.
  if (!json?.data?.children) {
    throw unexpectedShape(url.toString());
  }
  return {
    items: json.data.children
      .filter((c): c is ListingChildPost => c.kind === "t3")
      .map((c) => redditPostsToPost(c.data)),
    pageInfo: {
      nextPage: json.data.after ?? undefined,
      prevPage: json.data.before ?? undefined,
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
 * Reddit's search endpoints drop every over-18 post unless `include_over_18=on`,
 * so an entirely NSFW subreddit searches to zero hits without it. The plain
 * listings never filtered, so this defaults to on to keep search and feed
 * consistent; users who want search cleaned up turn it off in plugin options.
 */
const includeNsfwSearch = () =>
  localStorage.getItem(REDDIT_NSFW_SEARCH_KEY) !== "false";

/**
 * The two controls compose as an AND, and only in the restrictive direction:
 * the plugin option can clean up search on its own, and the host preference
 * overrides it when the reader has asked for adult content to be left out
 * everywhere. Neither can turn the other back on.
 */
const applyNsfwSearchParam = async (url: URL) => {
  if (includeNsfwSearch() && (await hostAllowsNsfw())) {
    url.searchParams.append("include_over_18", "on");
  }
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
  await applyNsfwSearchParam(url);
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
  // The subreddit prefix is optional on this endpoint, so requests that only
  // know the post id (favorites, comment permalinks) still work.
  const subredditPath = request.communityId ? `/r/${request.communityId}` : "";
  const url = new URL(
    `${baseUrl}${subredditPath}/comments/${request.apiId}.json`
  );
  if (request.commentApiId) {
    // Single comment thread: that comment becomes the root of the listing.
    url.searchParams.set("comment", request.commentApiId);
    url.searchParams.set("context", "0");
  }
  // Only pin a sort once one has been picked. Left off, Reddit falls back to
  // the subreddit's own suggested sort, which is the default we want.
  const requestedSort = request.sortId
    ? resolveSort(COMMENT_SORTS, request.sortId).sort
    : undefined;
  if (requestedSort) {
    url.searchParams.set("sort", requestedSort.id);
  }
  const response = await httpRequest(url.toString(), {
    headers,
  });
  const json = await readJson<CommentsResponse>(response, url.toString());
  // This endpoint returns a two-listing array: the post, then its comments.
  if (!Array.isArray(json) || !json[0]?.data?.children || !json[1]?.data) {
    throw unexpectedShape(url.toString());
  }
  const items =
    json[1].data?.children
      .filter((c): c is ListingChildComment => c.kind === "t1")
      .map((c) => redditCommentToPost(c.data)) ?? [];
  const postChild = json[0].data.children.filter(
    (c): c is ListingChildPost => c.kind === "t3"
  )[0];
  if (!postChild) {
    throw unexpectedShape(url.toString());
  }
  const post = redditPostsToPost(postChild.data);
  const more = json[1].data?.children.find(
    (c): c is ListingMore => c.kind === "more"
  )?.data;
  post.moreRepliesId = more?.id;
  post.moreRepliesCount = more?.count;

  // Report back which sort the returned comments are actually in, so the host
  // can show it. `suggested_sort` is the subreddit's default; it's null on most
  // posts and can name a sort we don't offer ("random", "live"), hence Best.
  const suggestedSort = COMMENT_SORTS.find(
    (s) => s.id === postChild.data.suggested_sort
  );

  return {
    items,
    post,
    sortOptions: COMMENT_SORTS,
    sortId: requestedSort?.id ?? suggestedSort?.id ?? COMMENT_SORTS[0].id,
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
  const json = await readJson<UserResponse>(response, url.toString());
  if (!json?.data?.children) {
    throw unexpectedShape(url.toString());
  }
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
  const json = await readJson<any>(response, url.toString());
  if (!json?.data?.children) {
    throw unexpectedShape(url.toString());
  }
  const items = json.data.children
    .filter((c: ListingChildSubreddit) => c.kind === "t5")
    .map((c: ListingChildSubreddit) => ({
      apiId: c.data.display_name,
      name: c.data.display_name,
      description: c.data.public_description,
      originalUrl: `https://www.reddit.com${c.data.url}`,
      nsfw: c.data.over_18 || undefined,
    }));

  return {
    items,
    pageInfo: {
      nextPage: json.data.after ?? undefined,
      prevPage: json.data.before ?? undefined,
    },
  };
};

const search = async (request: SearchRequest): Promise<SearchResponse> => {
  const baseUrl = getBaseUrl();
  const path = "/search.json";

  const url = new URL(`${baseUrl}${path}`);
  url.searchParams.append("q", request.query);
  url.searchParams.append("type", "link");
  await applyNsfwSearchParam(url);
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
    includeNsfwSearch: includeNsfwSearch(),
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
      localStorage.setItem(
        REDDIT_NSFW_SEARCH_KEY,
        String(message.includeNsfwSearch)
      );
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
