# Reddit Plugin for SocialGata

A SocialGata plugin that provides access to Reddit feeds, communities, comments, and user profiles.

## Features

- Browse Reddit's hot feed
- View subreddit communities
- Read post comments with nested replies
- View user profiles and their activity
- Search Reddit posts
- Video support via vxReddit integration
- Optional OAuth authentication for enhanced access

## Installation

### From URL (Recommended)

Install the plugin in SocialGata by providing the manifest URL:
```
https://cdn.jsdelivr.net/gh/InfoGata/reddit-socialgata@latest/manifest.json
```

### Manual Installation

1. Clone this repository
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. In SocialGata, add the plugin from the `dist/` folder

## Configuration (Optional)

For authenticated access to Reddit:

1. Go to [Reddit App Preferences](https://www.reddit.com/prefs/apps)
2. Click "create another app..." at the bottom
3. Choose "web app" as the app type
4. Set the redirect URI to your SocialGata instance URL + `/login_popup.html`
5. Copy the Client ID (under the app name) and Client Secret
6. Open the plugin options in SocialGata and paste your credentials

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
npm install
```

### Build

```bash
npm run build
```

This runs two builds:
- `npm run build:options` - Builds the options UI page
- `npm run build:plugin` - Builds the main plugin script

### Output

- `dist/index.js` - Main plugin script
- `dist/options.html` - Options/settings page

## Plugin API Methods

| Method | Description |
|--------|-------------|
| `onGetFeed` | Get Reddit's hot feed with pagination |
| `onGetCommunity` | Get posts from a specific subreddit |
| `onGetComments` | Get comments for a post |
| `onGetUser` | Get a user's profile and activity |
| `onSearch` | Search Reddit posts |
| `onLogin` | OAuth2 login flow |
| `onLogout` | Clear authentication |
| `onIsLoggedIn` | Check login status |
| `onGetPlatformType` | Returns "forum" |

## License

MIT
