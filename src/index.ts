import { MessageType, UiMessageType } from "./shared";

const pluginName = "reddit";
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
  secure_media: string | null;
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
  media: string | null;
  is_video: boolean;
  preview?: Preview;
}

interface Preview {
  enabled: boolean;
  images: PreviewImage[];
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

// State
let accessToken = localStorage.getItem(REDDIT_TOKEN_KEY) || "";

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
  const thumbnailUrl = post.is_video
    ? post.preview?.images[0]?.resolutions?.find(
        (r): r is PreviewImageResolution => r.width === 640
      )?.url
    : post.thumbnail;
  const decodedThumbnail = decodeHtmlEntities(thumbnailUrl);

  return {
    apiId: post.id,
    title: post.title,
    numOfComments: post.num_comments,
    score: post.score,
    authorName: post.author,
    authorApiId: post.author,
    communityName: post.subreddit,
    communityApiId: post.subreddit,
    body: post.selftext,
    pluginId: pluginName,
    thumbnailUrl:
      post.thumbnail === "self"
        ? undefined
        : isValidUrl(decodedThumbnail)
        ? decodedThumbnail
        : PLACEHOLDER_THUMBNAIL,
    url: post.thumbnail === "self" ? undefined : decodeHtmlEntities(post.url),
    isVideo: post.is_video,
  };
};

const redditCommentToPost = (comment: ListingChildCommentData): Post => {
  return {
    apiId: comment.id,
    body: comment.body,
    authorName: comment.author,
    authorApiId: comment.author,
    pluginId: pluginName,
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

const getVideoUrlFromVxReddit = async (
  permalink: string
): Promise<string | undefined> => {
  try {
    // Convert Reddit URL to vxReddit URL
    const vxRedditUrl = `https://vxreddit.com${permalink}`;

    // Fetch the vxReddit page
    const response = await application.networkRequest(vxRedditUrl);
    const html = await response.text();

    // Parse HTML to find video URL
    // vxReddit typically has the video URL in a meta tag or video element
    const videoUrlMatch = html.match(
      /<meta property="og:video" content="([^"]+)"/
    );
    if (videoUrlMatch && videoUrlMatch[1]) {
      return videoUrlMatch[1];
    }

    // Fallback: try to find video source tag
    const sourceMatch = html.match(/<source src="([^"]+)" type="video\/mp4"/);
    if (sourceMatch && sourceMatch[1]) {
      return sourceMatch[1];
    }

    // Another fallback: look for direct video URL in the page
    const directVideoMatch = html.match(/https:\/\/[^"'\s]+\.mp4/);
    if (directVideoMatch) {
      return directVideoMatch[0];
    }

    return undefined;
  } catch (error) {
    console.error("Error fetching video URL from vxReddit:", error);
    return undefined;
  }
};

// Plugin Methods

const getFeed = async (request?: GetFeedRequest): Promise<GetFeedResponse> => {
  const headers = getHeaders();
  const baseUrl = getBaseUrl();
  const path = "/hot.json";

  // Build URL with pagination parameters
  const url = new URL(`${baseUrl}${path}`);
  if (request?.pageInfo?.page) {
    url.searchParams.append("after", String(request.pageInfo.page));
  }

  const response = await application.networkRequest(url.toString(), {
    headers,
  });
  const json: RedditResponse = await response.json();
  const items =
    json.data?.children
      .filter((c): c is ListingChildPost => c.kind === "t3")
      .map((c) => redditPostsToPost(c.data)) ?? [];

  items.forEach((item, index) => {
    item.number =
      (Number(request?.pageInfo?.page ?? "1") - 1) * 25 + index + 1;
  });

  return {
    items,
    pageInfo: {
      nextPage: json.data?.after ?? undefined,
      prevPage: json.data?.before ?? undefined,
    },
  };
};

const getCommunity = async (
  request: GetCommunityRequest
): Promise<GetCommunityResponse> => {
  const headers = getHeaders();
  const baseUrl = getBaseUrl();
  const path = `/r/${request.apiId}/hot.json`;

  const url = new URL(`${baseUrl}${path}`);
  if (request.pageInfo?.page) {
    url.searchParams.append("after", String(request.pageInfo.page));
  }

  const response = await application.networkRequest(url.toString(), {
    headers,
  });
  const json: RedditResponse = await response.json();
  const items =
    json.data?.children
      .filter((c): c is ListingChildPost => c.kind === "t3")
      .map((c) => redditPostsToPost(c.data)) ?? [];

  return {
    items,
    pageInfo: {
      nextPage: json.data?.after ?? undefined,
      prevPage: json.data?.before ?? undefined,
    },
  };
};

const getComments = async (
  request: GetCommentsRequest
): Promise<GetCommentsResponse> => {
  const headers = getHeaders();
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/r/${request.communityId}/comments/${request.apiId}.json`;
  const response = await application.networkRequest(url, {
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

  // If it's a video post, get the actual video URL from vxReddit
  if (post.isVideo) {
    const postData = json[0].data.children[0].data;
    const videoUrl = await getVideoUrlFromVxReddit(postData.permalink);
    if (videoUrl) {
      post.url = videoUrl;
    }
  }

  return {
    items,
    post,
  };
};

const getUser = async (request: GetUserRequest): Promise<GetUserResponse> => {
  const headers = getHeaders();
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/user/${request.apiId}/overview.json`;
  const response = await application.networkRequest(url, {
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
  };
};

const search = async (request: SearchRequest): Promise<SearchResponse> => {
  const headers = getHeaders();
  const baseUrl = getBaseUrl();
  const path = "/search.json";

  const url = new URL(`${baseUrl}${path}`);
  url.searchParams.append("q", request.query);
  url.searchParams.append("type", "link");
  if (request.pageInfo?.page) {
    url.searchParams.append("after", String(request.pageInfo.page));
  }

  const response = await application.networkRequest(url.toString(), {
    headers,
  });
  const json: RedditResponse = await response.json();
  const items =
    json.data?.children
      .filter((c): c is ListingChildPost => c.kind === "t3")
      .map((c) => redditPostsToPost(c.data)) ?? [];

  return {
    items,
    pageInfo: {
      nextPage: json.data?.after ?? undefined,
      prevPage: json.data?.before ?? undefined,
    },
  };
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
application.onGetComments = getComments;
application.onGetUser = getUser;
application.onSearch = search;
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
