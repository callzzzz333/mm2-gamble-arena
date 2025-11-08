export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      case_battle_participants: {
        Row: {
          battle_id: string
          id: string
          items_won: Json
          joined_at: string
          position: number
          total_value: number
          user_id: string
        }
        Insert: {
          battle_id: string
          id?: string
          items_won?: Json
          joined_at?: string
          position: number
          total_value?: number
          user_id: string
        }
        Update: {
          battle_id?: string
          id?: string
          items_won?: Json
          joined_at?: string
          position?: number
          total_value?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_battle_participants_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "case_battles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_battle_rounds: {
        Row: {
          battle_id: string
          case_index: number
          created_at: string
          id: string
          results: Json
          round_number: number
        }
        Insert: {
          battle_id: string
          case_index: number
          created_at?: string
          id?: string
          results?: Json
          round_number: number
        }
        Update: {
          battle_id?: string
          case_index?: number
          created_at?: string
          id?: string
          results?: Json
          round_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "case_battle_rounds_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "case_battles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_battles: {
        Row: {
          cases: Json
          completed_at: string | null
          created_at: string
          creator_id: string
          current_round: number
          id: string
          max_players: number
          mode: string
          rounds: number
          started_at: string | null
          status: string
          total_value: number
          winner_id: string | null
        }
        Insert: {
          cases?: Json
          completed_at?: string | null
          created_at?: string
          creator_id: string
          current_round?: number
          id?: string
          max_players?: number
          mode?: string
          rounds?: number
          started_at?: string | null
          status?: string
          total_value?: number
          winner_id?: string | null
        }
        Update: {
          cases?: Json
          completed_at?: string | null
          created_at?: string
          creator_id?: string
          current_round?: number
          id?: string
          max_players?: number
          mode?: string
          rounds?: number
          started_at?: string | null
          status?: string
          total_value?: number
          winner_id?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string | null
          id: string
          message: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      christmas_raffle_tickets: {
        Row: {
          created_at: string
          id: string
          items_exchanged: Json
          total_tickets: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          items_exchanged?: Json
          total_tickets?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          items_exchanged?: Json
          total_tickets?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coinflip_games: {
        Row: {
          bet_amount: number
          completed_at: string | null
          created_at: string | null
          creator_id: string
          creator_items: Json | null
          creator_side: string
          id: string
          joiner_id: string | null
          joiner_items: Json | null
          result: string | null
          status: string
          winner_id: string | null
        }
        Insert: {
          bet_amount: number
          completed_at?: string | null
          created_at?: string | null
          creator_id: string
          creator_items?: Json | null
          creator_side: string
          id?: string
          joiner_id?: string | null
          joiner_items?: Json | null
          result?: string | null
          status?: string
          winner_id?: string | null
        }
        Update: {
          bet_amount?: number
          completed_at?: string | null
          created_at?: string | null
          creator_id?: string
          creator_items?: Json | null
          creator_side?: string
          id?: string
          joiner_id?: string | null
          joiner_items?: Json | null
          result?: string | null
          status?: string
          winner_id?: string | null
        }
        Relationships: []
      }
      crate_items: {
        Row: {
          crate_id: string
          created_at: string | null
          drop_chance: number
          id: string
          item_id: string
        }
        Insert: {
          crate_id: string
          created_at?: string | null
          drop_chance?: number
          id?: string
          item_id: string
        }
        Update: {
          crate_id?: string
          created_at?: string | null
          drop_chance?: number
          id?: string
          item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crate_items_crate_id_fkey"
            columns: ["crate_id"]
            isOneToOne: false
            referencedRelation: "crates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crate_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      crates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          level_required: number
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          level_required: number
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          level_required?: number
          name?: string
        }
        Relationships: []
      }
      crypto_deposits: {
        Row: {
          amount: number
          confirmed_at: string | null
          created_at: string
          currency: string
          id: string
          pay_address: string
          payment_id: string
          payment_status: string
          payment_url: string | null
          updated_at: string
          usd_amount: number
          user_id: string
        }
        Insert: {
          amount: number
          confirmed_at?: string | null
          created_at?: string
          currency: string
          id?: string
          pay_address: string
          payment_id: string
          payment_status?: string
          payment_url?: string | null
          updated_at?: string
          usd_amount: number
          user_id: string
        }
        Update: {
          amount?: number
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          pay_address?: string
          payment_id?: string
          payment_status?: string
          payment_url?: string | null
          updated_at?: string
          usd_amount?: number
          user_id?: string
        }
        Relationships: []
      }
      deposits: {
        Row: {
          created_at: string | null
          id: string
          items_deposited: Json | null
          private_server_link: string
          status: string
          trader_username: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          items_deposited?: Json | null
          private_server_link: string
          status?: string
          trader_username: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          items_deposited?: Json | null
          private_server_link?: string
          status?: string
          trader_username?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      giveaway_entries: {
        Row: {
          created_at: string | null
          giveaway_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          giveaway_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          giveaway_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "giveaway_entries_giveaway_id_fkey"
            columns: ["giveaway_id"]
            isOneToOne: false
            referencedRelation: "giveaways"
            referencedColumns: ["id"]
          },
        ]
      }
      giveaways: {
        Row: {
          created_at: string | null
          creator_id: string
          description: string | null
          discord_message_id: string | null
          ended_at: string | null
          ends_at: string | null
          id: string
          item_id: string | null
          prize_items: Json | null
          status: string
          title: string | null
          total_value: number | null
          type: string | null
          winner_id: string | null
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          description?: string | null
          discord_message_id?: string | null
          ended_at?: string | null
          ends_at?: string | null
          id?: string
          item_id?: string | null
          prize_items?: Json | null
          status?: string
          title?: string | null
          total_value?: number | null
          type?: string | null
          winner_id?: string | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          description?: string | null
          discord_message_id?: string | null
          ended_at?: string | null
          ends_at?: string | null
          id?: string
          item_id?: string | null
          prize_items?: Json | null
          status?: string
          title?: string | null
          total_value?: number | null
          type?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "giveaways_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          name: string
          rarity: string
          value: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          name: string
          rarity: string
          value?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          name?: string
          rarity?: string
          value?: number
        }
        Relationships: []
      }
      jackpot_entries: {
        Row: {
          bet_amount: number
          created_at: string | null
          game_id: string
          id: string
          items: Json | null
          user_id: string
          win_chance: number | null
        }
        Insert: {
          bet_amount: number
          created_at?: string | null
          game_id: string
          id?: string
          items?: Json | null
          user_id: string
          win_chance?: number | null
        }
        Update: {
          bet_amount?: number
          created_at?: string | null
          game_id?: string
          id?: string
          items?: Json | null
          user_id?: string
          win_chance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "jackpot_entries_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "jackpot_games"
            referencedColumns: ["id"]
          },
        ]
      }
      jackpot_games: {
        Row: {
          completed_at: string | null
          created_at: string | null
          draw_at: string | null
          id: string
          status: string
          total_pot: number
          winner_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          draw_at?: string | null
          id?: string
          status?: string
          total_pot?: number
          winner_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          draw_at?: string | null
          id?: string
          status?: string
          total_pot?: number
          winner_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          balance: number
          created_at: string | null
          id: string
          level: number
          roblox_id: number | null
          roblox_username: string | null
          total_deposited: number | null
          total_profits: number | null
          total_wagered: number | null
          username: string
          verification_code: string | null
          verified_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          balance?: number
          created_at?: string | null
          id: string
          level?: number
          roblox_id?: number | null
          roblox_username?: string | null
          total_deposited?: number | null
          total_profits?: number | null
          total_wagered?: number | null
          username: string
          verification_code?: string | null
          verified_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          balance?: number
          created_at?: string | null
          id?: string
          level?: number
          roblox_id?: number | null
          roblox_username?: string | null
          total_deposited?: number | null
          total_profits?: number | null
          total_wagered?: number | null
          username?: string
          verification_code?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          game_id: string | null
          game_type: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          game_id?: string | null
          game_type?: string | null
          id?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          game_id?: string | null
          game_type?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_claimed_rewards: {
        Row: {
          claimed_at: string | null
          crate_id: string
          id: string
          opened: boolean | null
          opened_at: string | null
          received_item_id: string | null
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          crate_id: string
          id?: string
          opened?: boolean | null
          opened_at?: string | null
          received_item_id?: string | null
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          crate_id?: string
          id?: string
          opened?: boolean | null
          opened_at?: string | null
          received_item_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_claimed_rewards_crate_id_fkey"
            columns: ["crate_id"]
            isOneToOne: false
            referencedRelation: "crates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_claimed_rewards_received_item_id_fkey"
            columns: ["received_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_items: {
        Row: {
          acquired_at: string | null
          id: string
          item_id: string
          quantity: number
          user_id: string
        }
        Insert: {
          acquired_at?: string | null
          id?: string
          item_id: string
          quantity?: number
          user_id: string
        }
        Update: {
          acquired_at?: string | null
          id?: string
          item_id?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_codes: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string | null
          id: string
          roblox_username: string | null
          used: boolean | null
          user_id: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          roblox_username?: string | null
          used?: boolean | null
          user_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          roblox_username?: string | null
          used?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          items_requested: Json | null
          private_server_link: string
          processed_at: string | null
          status: string
          trader_username: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          items_requested?: Json | null
          private_server_link: string
          processed_at?: string | null
          status?: string
          trader_username: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          items_requested?: Json | null
          private_server_link?: string
          processed_at?: string | null
          status?: string
          trader_username?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          id: string | null
          roblox_username: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          id?: string | null
          roblox_username?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          id?: string | null
          roblox_username?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_level: { Args: { wagered: number }; Returns: number }
      can_claim_crate_daily: {
        Args: { p_crate_id: string; p_user_id: string }
        Returns: boolean
      }
      generate_verification_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_user_balance: {
        Args: {
          p_amount: number
          p_description?: string
          p_game_id?: string
          p_game_type?: string
          p_type: string
          p_user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "item_manager"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "item_manager"],
    },
  },
} as const
