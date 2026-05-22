// ============================================================================
// Supabase Database Types — generated from supabase/migrations/001 through 038
// ============================================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ThemeMode = "light" | "dark";
export type MsgStatus = "unread" | "read" | "archived";
export type ExpType = "internship" | "certification" | "volunteer";

export interface Database {
  public: {
    Tables: {
      theme_settings: {
        Row: {
          id: string;
          mode: ThemeMode;
          light_primary: string;
          light_accent: string;
          light_background: string;
          light_foreground: string;
          light_card: string;
          light_border: string;
          light_muted: string;
          light_muted_foreground: string;
          light_ring: string;
          dark_primary: string;
          dark_accent: string;
          dark_background: string;
          dark_foreground: string;
          dark_card: string;
          dark_border: string;
          dark_muted: string;
          dark_muted_foreground: string;
          dark_ring: string;
          radius: string;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          mode?: ThemeMode;
          light_primary?: string;
          light_accent?: string;
          light_background?: string;
          light_foreground?: string;
          light_card?: string;
          light_border?: string;
          light_muted?: string;
          light_muted_foreground?: string;
          light_ring?: string;
          dark_primary?: string;
          dark_accent?: string;
          dark_background?: string;
          dark_foreground?: string;
          dark_card?: string;
          dark_border?: string;
          dark_muted?: string;
          dark_muted_foreground?: string;
          dark_ring?: string;
          radius?: string;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          mode?: ThemeMode;
          light_primary?: string;
          light_accent?: string;
          light_background?: string;
          light_foreground?: string;
          light_card?: string;
          light_border?: string;
          light_muted?: string;
          light_muted_foreground?: string;
          light_ring?: string;
          dark_primary?: string;
          dark_accent?: string;
          dark_background?: string;
          dark_foreground?: string;
          dark_card?: string;
          dark_border?: string;
          dark_muted?: string;
          dark_muted_foreground?: string;
          dark_ring?: string;
          radius?: string;
          updated_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      typography_settings: {
        Row: {
          id: string;
          body_font: string;
          display_font: string;
          body_font_url: string | null;
          display_font_url: string | null;
          base_font_size: string;
          line_height: string;
          letter_spacing: string;
          heading_scale: string;
          font_weight_body: string;
          font_weight_heading: string;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          body_font?: string;
          display_font?: string;
          body_font_url?: string | null;
          display_font_url?: string | null;
          base_font_size?: string;
          line_height?: string;
          letter_spacing?: string;
          heading_scale?: string;
          font_weight_body?: string;
          font_weight_heading?: string;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          body_font?: string;
          display_font?: string;
          body_font_url?: string | null;
          display_font_url?: string | null;
          base_font_size?: string;
          line_height?: string;
          letter_spacing?: string;
          heading_scale?: string;
          font_weight_body?: string;
          font_weight_heading?: string;
          updated_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          id: string;
          site_name: string;
          site_tagline: string;
          footer_text: string;
          copyright_text: string;
          logo_text: string;
          default_theme: ThemeMode;
          language_mode: string;
          default_language: string;
          show_language_toggle: boolean;
          rtl_enabled: boolean;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          site_name?: string;
          site_tagline?: string;
          footer_text?: string;
          copyright_text?: string;
          logo_text?: string;
          default_theme?: ThemeMode;
          language_mode?: string;
          default_language?: string;
          show_language_toggle?: boolean;
          rtl_enabled?: boolean;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          site_name?: string;
          site_tagline?: string;
          footer_text?: string;
          copyright_text?: string;
          logo_text?: string;
          default_theme?: ThemeMode;
          language_mode?: string;
          default_language?: string;
          show_language_toggle?: boolean;
          rtl_enabled?: boolean;
          updated_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      seo_settings: {
        Row: {
          id: string;
          title: string;
          description: string;
          keywords: string;
          og_title: string;
          og_description: string;
          og_image: string | null;
          canonical_url: string;
          twitter_card: string;
          twitter_creator: string | null;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title?: string;
          description?: string;
          keywords?: string;
          og_title?: string;
          og_description?: string;
          og_image?: string | null;
          canonical_url?: string;
          twitter_card?: string;
          twitter_creator?: string | null;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          keywords?: string;
          og_title?: string;
          og_description?: string;
          og_image?: string | null;
          canonical_url?: string;
          twitter_card?: string;
          twitter_creator?: string | null;
          updated_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      hero_content: {
        Row: {
          id: string;
          heading: string;
          name: string;
          roles: string[];
          description: string;
          heading_ar: string | null;
          name_ar: string | null;
          description_ar: string | null;
          github_url: string;
          linkedin_url: string;
          twitter_url: string | null;
          email: string;
          avatar_url: string | null;
          cv_url: string | null;
          stats: { label: string; value: string }[] | null;
          available: boolean;
          site_name: string | null;
          logo_url: string | null;
          favicon_url: string | null;
          tagline: string | null;
          cv_file_name: string | null;
          is_published: boolean;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          heading?: string;
          name?: string;
          roles?: string[];
          description?: string;
          heading_ar?: string | null;
          name_ar?: string | null;
          description_ar?: string | null;
          github_url?: string;
          linkedin_url?: string;
          twitter_url?: string | null;
          email?: string;
          avatar_url?: string | null;
          cv_url?: string | null;
          stats?: { label: string; value: string }[] | null;
          available?: boolean;
          site_name?: string | null;
          logo_url?: string | null;
          favicon_url?: string | null;
          tagline?: string | null;
          cv_file_name?: string | null;
          is_published?: boolean;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          heading?: string;
          name?: string;
          roles?: string[];
          description?: string;
          heading_ar?: string | null;
          name_ar?: string | null;
          description_ar?: string | null;
          github_url?: string;
          linkedin_url?: string;
          twitter_url?: string | null;
          email?: string;
          avatar_url?: string | null;
          cv_url?: string | null;
          stats?: { label: string; value: string }[] | null;
          available?: boolean;
          site_name?: string | null;
          logo_url?: string | null;
          favicon_url?: string | null;
          tagline?: string | null;
          cv_file_name?: string | null;
          is_published?: boolean;
          updated_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      about_content: {
        Row: {
          id: string;
          bio1: string;
          bio2: string;
          bio: string | null;
          location: string;
          years_of_experience: number;
          degree: string;
          school: string;
          grade: string;
          education_years: string;
          education: {
            degree: string;
            institution: string;
            year: string;
            description?: string;
          }[];
          languages: {
            name: string;
            level: number;
          }[];
          interests: string[];
          bio1_ar: string | null;
          bio2_ar: string | null;
          bio_ar: string | null;
          education_ar: {
            degree: string;
            institution: string;
            year: string;
            description?: string;
          }[] | null;
          languages_ar: {
            name: string;
            level: number;
          }[] | null;
          interests_ar: string[] | null;
          is_published: boolean;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          bio1?: string;
          bio2?: string;
          bio?: string | null;
          location?: string;
          years_of_experience?: number;
          degree?: string;
          school?: string;
          grade?: string;
          education_years?: string;
          education?: {
            degree: string;
            institution: string;
            year: string;
            description?: string;
          }[];
          languages?: {
            name: string;
            level: number;
          }[];
          interests?: string[];
          bio1_ar?: string | null;
          bio2_ar?: string | null;
          bio_ar?: string | null;
          education_ar?: {
            degree: string;
            institution: string;
            year: string;
            description?: string;
          }[] | null;
          languages_ar?: {
            name: string;
            level: number;
          }[] | null;
          interests_ar?: string[] | null;
          is_published?: boolean;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          bio1?: string;
          bio2?: string;
          bio?: string | null;
          location?: string;
          years_of_experience?: number;
          degree?: string;
          school?: string;
          grade?: string;
          education_years?: string;
          education?: {
            degree: string;
            institution: string;
            year: string;
            description?: string;
          }[];
          languages?: {
            name: string;
            level: number;
          }[];
          interests?: string[];
          bio1_ar?: string | null;
          bio2_ar?: string | null;
          bio_ar?: string | null;
          education_ar?: {
            degree: string;
            institution: string;
            year: string;
            description?: string;
          }[] | null;
          languages_ar?: {
            name: string;
            level: number;
          }[] | null;
          interests_ar?: string[] | null;
          is_published?: boolean;
          updated_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      contact_info: {
        Row: {
          id: string;
          email: string | null;
          phone: string | null;
          location: string | null;
          address: string | null;
          github: string | null;
          linkedin: string | null;
          whatsapp: string | null;
          map_embed_url: string | null;
          availability_status: string | null;
          working_hours: string | null;
          social_links: Json;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email?: string | null;
          phone?: string | null;
          location?: string | null;
          address?: string | null;
          github?: string | null;
          linkedin?: string | null;
          whatsapp?: string | null;
          map_embed_url?: string | null;
          availability_status?: string | null;
          working_hours?: string | null;
          social_links?: Json;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          phone?: string | null;
          location?: string | null;
          address?: string | null;
          github?: string | null;
          linkedin?: string | null;
          whatsapp?: string | null;
          map_embed_url?: string | null;
          availability_status?: string | null;
          working_hours?: string | null;
          social_links?: Json;
          updated_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      cv_settings: {
        Row: {
          id: string;
          object_path: string;
          file_name: string;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          object_path: string;
          file_name: string;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          object_path?: string;
          file_name?: string;
          updated_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      skills: {
        Row: {
          id: string;
          name: string;
          category: string;
          category_ar: string | null;
          proficiency: number;
          icon: string | null;
          sort_order: number | null;
          is_visible: boolean | null;
          user_id: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: string;
          category_ar?: string | null;
          proficiency: number;
          icon?: string | null;
          sort_order?: number | null;
          is_visible?: boolean | null;
          user_id?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string;
          category_ar?: string | null;
          proficiency?: number;
          icon?: string | null;
          sort_order?: number | null;
          is_visible?: boolean | null;
          user_id?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          title: string;
          description: string;
          full_description: string | null;
          challenges: string | null;
          outcome: string | null;
          title_ar: string | null;
          description_ar: string | null;
          full_description_ar: string | null;
          challenges_ar: string | null;
          outcome_ar: string | null;
          completed_at: string | null;
          tech_stack: string[];
          category: string | null;
          featured: boolean | null;
          github_url: string | null;
          live_url: string | null;
          slug: string | null;
          metrics: string[];
          sort_order: number | null;
          is_published: boolean | null;
          image_url: string | null;
          tags: string[];
          user_id: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          full_description?: string | null;
          challenges?: string | null;
          outcome?: string | null;
          title_ar?: string | null;
          description_ar?: string | null;
          full_description_ar?: string | null;
          challenges_ar?: string | null;
          outcome_ar?: string | null;
          completed_at?: string | null;
          tech_stack?: string[];
          category?: string | null;
          featured?: boolean | null;
          github_url?: string | null;
          live_url?: string | null;
          slug?: string | null;
          metrics?: string[];
          sort_order?: number | null;
          is_published?: boolean | null;
          image_url?: string | null;
          tags?: string[];
          user_id?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          full_description?: string | null;
          challenges?: string | null;
          outcome?: string | null;
          title_ar?: string | null;
          description_ar?: string | null;
          full_description_ar?: string | null;
          challenges_ar?: string | null;
          outcome_ar?: string | null;
          completed_at?: string | null;
          tech_stack?: string[];
          category?: string | null;
          featured?: boolean | null;
          github_url?: string | null;
          live_url?: string | null;
          slug?: string | null;
          metrics?: string[];
          sort_order?: number | null;
          is_published?: boolean | null;
          image_url?: string | null;
          tags?: string[];
          user_id?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      experience: {
        Row: {
          id: string;
          title: string;
          company: string;
          location: string;
          period: string;
          description: string[];
          technologies: string[];
          title_ar: string | null;
          company_ar: string | null;
          location_ar: string | null;
          description_ar: string[] | null;
          type: ExpType;
          sort_order: number | null;
          is_published: boolean | null;
          current: boolean | null;
          order_num: number | null;
          user_id: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          company: string;
          location: string;
          period: string;
          description?: string[];
          technologies?: string[];
          title_ar?: string | null;
          company_ar?: string | null;
          location_ar?: string | null;
          description_ar?: string[] | null;
          type: ExpType;
          sort_order?: number | null;
          is_published?: boolean | null;
          current?: boolean | null;
          order_num?: number | null;
          user_id?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          company?: string;
          location?: string;
          period?: string;
          description?: string[];
          technologies?: string[];
          title_ar?: string | null;
          company_ar?: string | null;
          location_ar?: string | null;
          description_ar?: string[] | null;
          type?: ExpType;
          sort_order?: number | null;
          is_published?: boolean | null;
          current?: boolean | null;
          order_num?: number | null;
          user_id?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      certifications: {
        Row: {
          id: string;
          title: string;
          issuer: string;
          title_ar: string | null;
          issuer_ar: string | null;
          issuer_logo: string | null;
          date: string;
          date_sort: string | null;
          category: string | null;
          credential_url: string | null;
          credential_id: string | null;
          sort_order: number | null;
          is_published: boolean | null;
          skills: string[];
          user_id: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          issuer: string;
          title_ar?: string | null;
          issuer_ar?: string | null;
          issuer_logo?: string | null;
          date: string;
          date_sort?: string | null;
          category?: string | null;
          credential_url?: string | null;
          credential_id?: string | null;
          sort_order?: number | null;
          is_published?: boolean | null;
          skills?: string[];
          user_id?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          issuer?: string;
          title_ar?: string | null;
          issuer_ar?: string | null;
          issuer_logo?: string | null;
          date?: string;
          date_sort?: string | null;
          category?: string | null;
          credential_url?: string | null;
          credential_id?: string | null;
          sort_order?: number | null;
          is_published?: boolean | null;
          skills?: string[];
          user_id?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          name: string;
          email: string;
          subject: string | null;
          message: string;
          status: MsgStatus;
          reply_email_draft: string | null;
          replied_at: string | null;
          user_id: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          subject?: string | null;
          message: string;
          status?: MsgStatus;
          reply_email_draft?: string | null;
          replied_at?: string | null;
          user_id?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          subject?: string | null;
          message?: string;
          status?: MsgStatus;
          reply_email_draft?: string | null;
          replied_at?: string | null;
          user_id?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      section_settings: {
        Row: {
          id: string;
          key: string;
          label: string;
          is_visible: boolean;
          sort_order: number;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          label: string;
          is_visible?: boolean;
          sort_order?: number;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          label?: string;
          is_visible?: boolean;
          sort_order?: number;
          updated_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      content_snapshots: {
        Row: {
          id: string;
          entity_type: string;
          entity_id: string;
          version: number;
          data: Json;
          changed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          entity_type: string;
          entity_id: string;
          version?: number;
          data?: Json;
          changed_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          entity_type?: string;
          entity_id?: string;
          version?: number;
          data?: Json;
          changed_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      section_variants: {
        Row: {
          id: string;
          section_key: string;
          variant_key: string;
          label: string;
          is_active: boolean;
          config: Json;
          preview_note: string | null;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          section_key: string;
          variant_key: string;
          label: string;
          is_active?: boolean;
          config?: Json;
          preview_note?: string | null;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          section_key?: string;
          variant_key?: string;
          label?: string;
          is_active?: boolean;
          config?: Json;
          preview_note?: string | null;
          updated_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      analytics_events: {
        Row: {
          id: string;
          type: string;
          path: string | null;
          section_key: string | null;
          project_id: string | null;
          preset_id: string | null;
          referrer: string | null;
          device: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          type: string;
          path?: string | null;
          section_key?: string | null;
          project_id?: string | null;
          preset_id?: string | null;
          referrer?: string | null;
          device?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          type?: string;
          path?: string | null;
          section_key?: string | null;
          project_id?: string | null;
          preset_id?: string | null;
          referrer?: string | null;
          device?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      content_health_reports: {
        Row: {
          id: string;
          scope: string;
          issues: Json;
          critical_count: number;
          warning_count: number;
          suggestion_count: number;
          generated_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          scope: string;
          issues?: Json;
          critical_count?: number;
          warning_count?: number;
          suggestion_count?: number;
          generated_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          scope?: string;
          issues?: Json;
          critical_count?: number;
          warning_count?: number;
          suggestion_count?: number;
          generated_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      image_metadata: {
        Row: {
          id: string;
          storage_path: string;
          original_filename: string;
          mime_type: string;
          width: number | null;
          height: number | null;
          file_size_bytes: number;
          blur_hash: string | null;
          dominant_color: string | null;
          alt_text: string | null;
          entity_type: string;
          entity_id: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          storage_path: string;
          original_filename: string;
          mime_type: string;
          width?: number | null;
          height?: number | null;
          file_size_bytes: number;
          blur_hash?: string | null;
          dominant_color?: string | null;
          alt_text?: string | null;
          entity_type: string;
          entity_id?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          storage_path?: string;
          original_filename?: string;
          mime_type?: string;
          width?: number | null;
          height?: number | null;
          file_size_bytes?: number;
          blur_hash?: string | null;
          dominant_color?: string | null;
          alt_text?: string | null;
          entity_type?: string;
          entity_id?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      image_variants: {
        Row: {
          id: string;
          parent_image_id: string;
          variant_type: string;
          storage_path: string;
          width: number | null;
          height: number | null;
          file_size_bytes: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          parent_image_id: string;
          variant_type: string;
          storage_path: string;
          width?: number | null;
          height?: number | null;
          file_size_bytes?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          parent_image_id?: string;
          variant_type?: string;
          storage_path?: string;
          width?: number | null;
          height?: number | null;
          file_size_bytes?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          clerk_id: string;
          email: string;
          name: string | null;
          role: "user" | "superadmin";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clerk_id: string;
          email: string;
          name?: string | null;
          role?: "user" | "superadmin";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          clerk_id?: string;
          email?: string;
          name?: string | null;
          role?: "user" | "superadmin";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      reorder_sections: {
        Args: { section_ids: string[]; sort_orders: number[] };
        Returns: void;
      };
    };
    Enums: {
      theme_mode: ThemeMode;
      msg_status: MsgStatus;
      exp_type: ExpType;
    };
    CompositeTypes: Record<string, never>;
  };
}

// ============================================================================
// Helper types
// ============================================================================
type TableRow<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
type TableInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
type TableUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];

// ============================================================================
// Domain type aliases
// ============================================================================
export type ThemeSettings = TableRow<"theme_settings">;
export type TypographySettings = TableRow<"typography_settings">;
export type SiteSettings = TableRow<"site_settings">;
export type SeoSettings = TableRow<"seo_settings">;
export type HeroContent = TableRow<"hero_content">;
export type AboutContent = TableRow<"about_content">;
export type ContactInfo = TableRow<"contact_info">;
export type CvSettings = TableRow<"cv_settings">;
export type Skill = TableRow<"skills">;
export type Project = TableRow<"projects">;
export type Experience = TableRow<"experience">;
export type Certification = TableRow<"certifications">;
export type Message = TableRow<"messages">;
export type SectionSetting = TableRow<"section_settings">;
export type ContentSnapshot = TableRow<"content_snapshots">;
export type SectionVariant = TableRow<"section_variants">;
export type AnalyticsEvent = TableRow<"analytics_events">;
export type ContentHealthReport = TableRow<"content_health_reports">;
export type ImageMetadata = TableRow<"image_metadata">;
export type ImageVariant = TableRow<"image_variants">;

export type InsertThemeSettings = TableInsert<"theme_settings">;
export type InsertTypographySettings = TableInsert<"typography_settings">;
export type InsertSiteSettings = TableInsert<"site_settings">;
export type InsertSeoSettings = TableInsert<"seo_settings">;
export type InsertHeroContent = TableInsert<"hero_content">;
export type InsertAboutContent = TableInsert<"about_content">;
export type InsertContactInfo = TableInsert<"contact_info">;
export type InsertCvSettings = TableInsert<"cv_settings">;
export type InsertSkill = TableInsert<"skills">;
export type InsertProject = TableInsert<"projects">;
export type InsertExperience = TableInsert<"experience">;
export type InsertCertification = TableInsert<"certifications">;
export type InsertMessage = TableInsert<"messages">;
export type InsertSectionSetting = TableInsert<"section_settings">;
export type User = TableRow<"users">;
export type InsertUser = TableInsert<"users">;
export type UpdateUser = TableUpdate<"users">;
