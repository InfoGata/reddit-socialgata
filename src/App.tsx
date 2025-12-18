import { useState, useEffect } from "preact/hooks";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { MessageType, UiMessageType } from "./shared";

const sendUiMessage = (message: UiMessageType) => {
  parent.postMessage(message, "*");
};

const App = () => {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const onMessage = (event: MessageEvent<MessageType>) => {
      switch (event.data.type) {
        case "info":
          setClientId(event.data.clientId);
          setClientSecret(event.data.clientSecret);
          setIsLoggedIn(event.data.isLoggedIn);
          break;
      }
    };

    window.addEventListener("message", onMessage);
    sendUiMessage({ type: "check-login" });
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const saveCredentials = () => {
    sendUiMessage({ type: "save", clientId, clientSecret });
  };

  return (
    <div className="flex flex-col gap-4 p-4 max-w-md">
      <h1 className="text-xl font-bold">Reddit Plugin Settings</h1>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Status: {isLoggedIn ? (
            <span className="text-green-600 font-medium">Logged In</span>
          ) : (
            <span className="text-yellow-600 font-medium">Not Logged In</span>
          )}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-medium">Reddit API Credentials (Optional)</h2>
        <p className="text-sm text-muted-foreground">
          For authenticated access, create a Reddit app at{" "}
          <a href="https://www.reddit.com/prefs/apps" target="_blank">
            reddit.com/prefs/apps
          </a>
          {" "}and enter the credentials below.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Client ID</label>
        <Input
          placeholder="Reddit Client ID"
          value={clientId}
          onChange={(e: any) => {
            const value = (e.target as HTMLInputElement).value;
            setClientId(value);
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Client Secret</label>
        <Input
          type="password"
          placeholder="Reddit Client Secret"
          value={clientSecret}
          onChange={(e: any) => {
            const value = (e.target as HTMLInputElement).value;
            setClientSecret(value);
          }}
        />
      </div>

      <Button onClick={saveCredentials}>Save</Button>

      <div className="text-sm text-muted-foreground mt-4">
        <h3 className="font-medium mb-2">Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>Go to <a href="https://www.reddit.com/prefs/apps" target="_blank">Reddit App Preferences</a></li>
          <li>Click "create another app..." at the bottom</li>
          <li>Choose "web app" as the app type</li>
          <li>Set the redirect URI to your SocialGata instance URL</li>
          <li>Copy the Client ID (under the app name) and Client Secret</li>
          <li>Paste them here and click Save</li>
        </ol>
      </div>
    </div>
  );
};

export default App;
