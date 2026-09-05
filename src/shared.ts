type UiCheckLogin = {
  type: "check-login";
};

type UiSave = {
  type: "save";
  clientId: string;
  clientSecret: string;
  includeNsfwSearch: boolean;
};

export type UiMessageType = UiCheckLogin | UiSave;

type InfoType = {
  type: "info";
  clientId: string;
  clientSecret: string;
  isLoggedIn: boolean;
  includeNsfwSearch: boolean;
};

export type MessageType = InfoType;
