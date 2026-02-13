export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          privy_id: string;
          wallet_address: string;
          display_name: string | null;
          email: string | null;
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["users"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      groups: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["groups"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["groups"]["Insert"]>;
      };
      group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["group_members"]["Row"], "id" | "joined_at">;
        Update: Partial<Database["public"]["Tables"]["group_members"]["Insert"]>;
      };
      expenses: {
        Row: {
          id: string;
          group_id: string;
          paid_by: string;
          amount: number;
          description: string;
          category: string | null;
          receipt_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["expenses"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["expenses"]["Insert"]>;
      };
      expense_splits: {
        Row: {
          id: string;
          expense_id: string;
          user_id: string;
          amount: number;
        };
        Insert: Omit<Database["public"]["Tables"]["expense_splits"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["expense_splits"]["Insert"]>;
      };
      settlements: {
        Row: {
          id: string;
          group_id: string;
          from_user: string;
          to_user: string;
          amount: number;
          tx_hash: string | null;
          memo: string | null;
          status: "pending" | "completed" | "failed";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["settlements"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["settlements"]["Insert"]>;
      };
      activity_feed: {
        Row: {
          id: string;
          group_id: string | null;
          actor_id: string;
          type: "expense_added" | "settlement" | "group_created" | "member_joined";
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["activity_feed"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["activity_feed"]["Insert"]>;
      };
    };
  };
}

// Convenience types
export type User = Database["public"]["Tables"]["users"]["Row"];
export type Group = Database["public"]["Tables"]["groups"]["Row"];
export type GroupMember = Database["public"]["Tables"]["group_members"]["Row"];
export type Expense = Database["public"]["Tables"]["expenses"]["Row"];
export type ExpenseSplit = Database["public"]["Tables"]["expense_splits"]["Row"];
export type Settlement = Database["public"]["Tables"]["settlements"]["Row"];
export type ActivityFeedItem = Database["public"]["Tables"]["activity_feed"]["Row"];
