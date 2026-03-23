export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
};

export type Conversation = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ApiHealth = {
  status: "ok" | "error";
  timestamp: string;
};
