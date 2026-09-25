// Database types in the shape `supabase gen types typescript` produces.
//
// Regenerate from the real schema with `npm run db:types` (needs the local
// Supabase stack running). Until then this file is maintained by hand and must
// match supabase/migrations/.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Fk<Name extends string, Col extends string, Ref extends string> = {
  foreignKeyName: Name;
  columns: [Col];
  isOneToOne: false;
  referencedRelation: Ref;
  referencedColumns: ["id"];
};

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13";
  };
  public: {
    Tables: {
      regions: {
        Row: { id: string; slug: string; name: string; timezone: string };
        Insert: { id?: string; slug: string; name: string; timezone: string };
        Update: { id?: string; slug?: string; name?: string; timezone?: string };
        Relationships: [];
      };
      categories: {
        Row: { id: string; slug: string; name: string; sort_order: number };
        Insert: { id?: string; slug: string; name: string; sort_order?: number };
        Update: { id?: string; slug?: string; name?: string; sort_order?: number };
        Relationships: [];
      };
      subcategories: {
        Row: { id: string; category_id: string; slug: string; name: string; sort_order: number };
        Insert: { id?: string; category_id: string; slug: string; name: string; sort_order?: number };
        Update: { id?: string; category_id?: string; slug?: string; name?: string; sort_order?: number };
        Relationships: [Fk<"subcategories_category_id_fkey", "category_id", "categories">];
      };
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          bio: string | null;
          area: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          bio?: string | null;
          area?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          bio?: string | null;
          area?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      accounts: {
        Row: {
          id: string;
          accepted_terms_at: string | null;
          is_site_admin: boolean;
          suspended_at: string | null;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          accepted_terms_at?: string | null;
          is_site_admin?: boolean;
          suspended_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          accepted_terms_at?: string | null;
          is_site_admin?: boolean;
          suspended_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      groups: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string;
          rules: string | null;
          subcategory_id: string;
          region_id: string;
          area: string;
          join_policy: Database["public"]["Enums"]["join_policy"];
          join_question: string | null;
          discussions_enabled: boolean;
          cover_image_path: string | null;
          status: Database["public"]["Enums"]["group_status"];
          created_by: string | null;
          created_at: string;
          updated_at: string;
          search: unknown;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description: string;
          rules?: string | null;
          subcategory_id: string;
          region_id: string;
          area: string;
          join_policy?: Database["public"]["Enums"]["join_policy"];
          join_question?: string | null;
          discussions_enabled?: boolean;
          cover_image_path?: string | null;
          status?: Database["public"]["Enums"]["group_status"];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string;
          rules?: string | null;
          subcategory_id?: string;
          region_id?: string;
          area?: string;
          join_policy?: Database["public"]["Enums"]["join_policy"];
          join_question?: string | null;
          discussions_enabled?: boolean;
          cover_image_path?: string | null;
          status?: Database["public"]["Enums"]["group_status"];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          Fk<"groups_subcategory_id_fkey", "subcategory_id", "subcategories">,
          Fk<"groups_region_id_fkey", "region_id", "regions">,
          Fk<"groups_created_by_fkey", "created_by", "profiles">,
        ];
      };
      group_members: {
        Row: {
          group_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["member_role"];
          status: Database["public"]["Enums"]["member_status"];
          join_answer: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          group_id: string;
          user_id: string;
          role?: Database["public"]["Enums"]["member_role"];
          status?: Database["public"]["Enums"]["member_status"];
          join_answer?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          group_id?: string;
          user_id?: string;
          role?: Database["public"]["Enums"]["member_role"];
          status?: Database["public"]["Enums"]["member_status"];
          join_answer?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          Fk<"group_members_group_id_fkey", "group_id", "groups">,
          Fk<"group_members_user_id_fkey", "user_id", "profiles">,
        ];
      };
      events: {
        Row: {
          id: string;
          group_id: string;
          title: string;
          description: string;
          starts_at: string;
          ends_at: string;
          timezone: string;
          location_name: string;
          address_visibility: Database["public"]["Enums"]["address_visibility"];
          capacity: number | null;
          status: Database["public"]["Enums"]["event_status"];
          created_by: string | null;
          created_at: string;
          updated_at: string;
          search: unknown;
        };
        Insert: {
          id?: string;
          group_id: string;
          title: string;
          description?: string;
          starts_at: string;
          ends_at: string;
          timezone: string;
          location_name: string;
          address_visibility?: Database["public"]["Enums"]["address_visibility"];
          capacity?: number | null;
          status?: Database["public"]["Enums"]["event_status"];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          title?: string;
          description?: string;
          starts_at?: string;
          ends_at?: string;
          timezone?: string;
          location_name?: string;
          address_visibility?: Database["public"]["Enums"]["address_visibility"];
          capacity?: number | null;
          status?: Database["public"]["Enums"]["event_status"];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          Fk<"events_group_id_fkey", "group_id", "groups">,
          Fk<"events_created_by_fkey", "created_by", "profiles">,
        ];
      };
      event_private_details: {
        Row: { event_id: string; address: string };
        Insert: { event_id: string; address: string };
        Update: { event_id?: string; address?: string };
        Relationships: [];
      };
      event_rsvps: {
        Row: {
          event_id: string;
          user_id: string;
          status: Database["public"]["Enums"]["rsvp_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          event_id: string;
          user_id: string;
          status: Database["public"]["Enums"]["rsvp_status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          event_id?: string;
          user_id?: string;
          status?: Database["public"]["Enums"]["rsvp_status"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          Fk<"event_rsvps_event_id_fkey", "event_id", "events">,
          Fk<"event_rsvps_user_id_fkey", "user_id", "profiles">,
        ];
      };
      threads: {
        Row: {
          id: string;
          group_id: string;
          author_id: string | null;
          title: string;
          body: string;
          is_pinned: boolean;
          is_locked: boolean;
          status: Database["public"]["Enums"]["post_status"];
          reply_count: number;
          last_activity_at: string;
          created_at: string;
          edited_at: string | null;
        };
        Insert: {
          id?: string;
          group_id: string;
          author_id?: string | null;
          title: string;
          body: string;
          is_pinned?: boolean;
          is_locked?: boolean;
          status?: Database["public"]["Enums"]["post_status"];
          reply_count?: number;
          last_activity_at?: string;
          created_at?: string;
          edited_at?: string | null;
        };
        Update: {
          id?: string;
          group_id?: string;
          author_id?: string | null;
          title?: string;
          body?: string;
          is_pinned?: boolean;
          is_locked?: boolean;
          status?: Database["public"]["Enums"]["post_status"];
          reply_count?: number;
          last_activity_at?: string;
          created_at?: string;
          edited_at?: string | null;
        };
        Relationships: [
          Fk<"threads_group_id_fkey", "group_id", "groups">,
          Fk<"threads_author_id_fkey", "author_id", "profiles">,
        ];
      };
      replies: {
        Row: {
          id: string;
          thread_id: string;
          author_id: string | null;
          body: string;
          status: Database["public"]["Enums"]["post_status"];
          created_at: string;
          edited_at: string | null;
        };
        Insert: {
          id?: string;
          thread_id: string;
          author_id?: string | null;
          body: string;
          status?: Database["public"]["Enums"]["post_status"];
          created_at?: string;
          edited_at?: string | null;
        };
        Update: {
          id?: string;
          thread_id?: string;
          author_id?: string | null;
          body?: string;
          status?: Database["public"]["Enums"]["post_status"];
          created_at?: string;
          edited_at?: string | null;
        };
        Relationships: [
          Fk<"replies_thread_id_fkey", "thread_id", "threads">,
          Fk<"replies_author_id_fkey", "author_id", "profiles">,
        ];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string | null;
          target_type: Database["public"]["Enums"]["report_target"];
          target_id: string;
          group_id: string | null;
          reason: Database["public"]["Enums"]["report_reason"];
          note: string | null;
          status: Database["public"]["Enums"]["report_status"];
          handled_by: string | null;
          handled_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id?: string | null;
          target_type: Database["public"]["Enums"]["report_target"];
          target_id: string;
          group_id?: string | null;
          reason: Database["public"]["Enums"]["report_reason"];
          note?: string | null;
          status?: Database["public"]["Enums"]["report_status"];
          handled_by?: string | null;
          handled_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string | null;
          target_type?: Database["public"]["Enums"]["report_target"];
          target_id?: string;
          group_id?: string | null;
          reason?: Database["public"]["Enums"]["report_reason"];
          note?: string | null;
          status?: Database["public"]["Enums"]["report_status"];
          handled_by?: string | null;
          handled_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          Fk<"reports_group_id_fkey", "group_id", "groups">,
          Fk<"reports_reporter_id_fkey", "reporter_id", "profiles">,
        ];
      };
      moderation_actions: {
        Row: {
          id: string;
          actor_id: string | null;
          action: Database["public"]["Enums"]["moderation_action_type"];
          target_type: Database["public"]["Enums"]["report_target"];
          target_id: string;
          group_id: string | null;
          reason: string;
          content_snapshot: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: Database["public"]["Enums"]["moderation_action_type"];
          target_type: Database["public"]["Enums"]["report_target"];
          target_id: string;
          group_id?: string | null;
          reason?: string;
          content_snapshot?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          action?: Database["public"]["Enums"]["moderation_action_type"];
          target_type?: Database["public"]["Enums"]["report_target"];
          target_id?: string;
          group_id?: string | null;
          reason?: string;
          content_snapshot?: Json | null;
          created_at?: string;
        };
        Relationships: [Fk<"moderation_actions_actor_id_fkey", "actor_id", "profiles">];
      };
      notification_preferences: {
        Row: { user_id: string; email_type: string; enabled: boolean };
        Insert: { user_id: string; email_type: string; enabled: boolean };
        Update: { user_id?: string; email_type?: string; enabled?: boolean };
        Relationships: [];
      };
      email_log: {
        Row: {
          id: string;
          user_id: string | null;
          email_type: string;
          related_id: string | null;
          sent_at: string;
          provider_message_id: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          email_type: string;
          related_id?: string | null;
          sent_at?: string;
          provider_message_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          email_type?: string;
          related_id?: string | null;
          sent_at?: string;
          provider_message_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      group_listings: {
        Row: {
          id: string | null;
          slug: string | null;
          name: string | null;
          description: string | null;
          area: string | null;
          join_policy: Database["public"]["Enums"]["join_policy"] | null;
          status: Database["public"]["Enums"]["group_status"] | null;
          region_id: string | null;
          created_at: string | null;
          subcategory_id: string | null;
          subcategory_slug: string | null;
          subcategory_name: string | null;
          category_id: string | null;
          category_slug: string | null;
          category_name: string | null;
          member_count: number | null;
          next_event_at: string | null;
          search: unknown;
        };
        Relationships: [];
      };
      subcategory_group_counts: {
        Row: {
          category_id: string | null;
          category_slug: string | null;
          category_name: string | null;
          category_sort_order: number | null;
          subcategory_id: string | null;
          subcategory_slug: string | null;
          subcategory_name: string | null;
          subcategory_sort_order: number | null;
          group_count: number | null;
        };
        Relationships: [];
      };
      event_listings: {
        Row: {
          id: string | null;
          group_id: string | null;
          group_slug: string | null;
          group_name: string | null;
          category_slug: string | null;
          title: string | null;
          starts_at: string | null;
          ends_at: string | null;
          timezone: string | null;
          location_name: string | null;
          address_visibility: Database["public"]["Enums"]["address_visibility"] | null;
          capacity: number | null;
          status: Database["public"]["Enums"]["event_status"] | null;
          going_count: number | null;
          search: unknown;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_site_admin: { Args: never; Returns: boolean };
      can_write: { Args: never; Returns: boolean };
      is_group_member: { Args: { p_group_id: string }; Returns: boolean };
      is_group_admin: { Args: { p_group_id: string }; Returns: boolean };
      is_group_owner: { Args: { p_group_id: string }; Returns: boolean };
      group_member_count: { Args: { p_group_id: string }; Returns: number };
      event_going_count: { Args: { p_event_id: string }; Returns: number };
      complete_onboarding: {
        Args: {
          p_display_name: string;
          p_bio?: string;
          p_area?: string;
          p_confirm_adult?: boolean;
          p_accept_terms?: boolean;
        };
        Returns: undefined;
      };
      approve_member: { Args: { p_group_id: string; p_user_id: string }; Returns: undefined };
      decline_member: { Args: { p_group_id: string; p_user_id: string }; Returns: undefined };
      remove_member: {
        Args: { p_group_id: string; p_user_id: string; p_reason?: string };
        Returns: undefined;
      };
      set_member_role: {
        Args: {
          p_group_id: string;
          p_user_id: string;
          p_role: Database["public"]["Enums"]["member_role"];
        };
        Returns: undefined;
      };
      transfer_ownership: { Args: { p_group_id: string; p_new_owner: string }; Returns: undefined };
      archive_group: { Args: { p_group_id: string; p_reason?: string }; Returns: undefined };
      restore_group: { Args: { p_group_id: string }; Returns: undefined };
      remove_group: { Args: { p_group_id: string; p_reason: string }; Returns: undefined };
      set_thread_flags: {
        Args: { p_thread_id: string; p_pinned?: boolean; p_locked?: boolean };
        Returns: undefined;
      };
      remove_post: {
        Args: {
          p_target_type: Database["public"]["Enums"]["report_target"];
          p_target_id: string;
          p_reason?: string;
        };
        Returns: undefined;
      };
      delete_own_post: {
        Args: { p_target_type: Database["public"]["Enums"]["report_target"]; p_target_id: string };
        Returns: undefined;
      };
      resolve_report: {
        Args: { p_report_id: string; p_status: Database["public"]["Enums"]["report_status"] };
        Returns: undefined;
      };
      suspend_user: { Args: { p_user_id: string; p_reason: string }; Returns: undefined };
      unsuspend_user: { Args: { p_user_id: string }; Returns: undefined };
      delete_my_account: { Args: never; Returns: undefined };
    };
    Enums: {
      join_policy: "open" | "approval";
      group_status: "active" | "archived" | "removed";
      member_role: "owner" | "admin" | "member";
      member_status: "pending" | "active" | "banned";
      address_visibility: "public" | "members";
      event_status: "scheduled" | "cancelled";
      rsvp_status: "going" | "not_going";
      post_status: "visible" | "deleted_by_author" | "removed";
      report_target: "group" | "event" | "thread" | "reply" | "profile";
      report_reason: "spam" | "harassment" | "unsafe" | "off_topic" | "other";
      report_status: "open" | "actioned" | "dismissed";
      moderation_action_type:
        | "remove_content"
        | "ban_member"
        | "suspend_user"
        | "unsuspend_user"
        | "archive_group"
        | "restore_group"
        | "remove_group";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
