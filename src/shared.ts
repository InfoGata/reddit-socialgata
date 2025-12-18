type UiCheckLogin = {
  type: "check-login";
};

type UiSave = {
  type: "save";
  clientId: string;
  clientSecret: string;
};

export type UiMessageType = UiCheckLogin | UiSave;

type InfoType = {
  type: "info";
  clientId: string;
  clientSecret: string;
  isLoggedIn: boolean;
};

export type MessageType = InfoType;
