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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          id: string
          performed_by: string | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          id?: string
          performed_by?: string | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          id?: string
          performed_by?: string | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      business_goals: {
        Row: {
          created_at: string
          created_by: string | null
          employee_id: string | null
          goal_type: string
          id: string
          period_month: number | null
          period_year: number
          ref_key: string | null
          target: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          employee_id?: string | null
          goal_type: string
          id?: string
          period_month?: number | null
          period_year: number
          ref_key?: string | null
          target?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          employee_id?: string | null
          goal_type?: string
          id?: string
          period_month?: number | null
          period_year?: number
          ref_key?: string | null
          target?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_goals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          ends_at: string | null
          id: string
          starts_at: string
          title: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          starts_at: string
          title: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          starts_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          actual_cost: number | null
          asset_url: string | null
          audience: string | null
          budget: number | null
          channel: string | null
          created_at: string
          end_date: string | null
          goal: string | null
          id: string
          internal_code: string | null
          is_active: boolean | null
          name: string
          notes: string | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          asset_url?: string | null
          audience?: string | null
          budget?: number | null
          channel?: string | null
          created_at?: string
          end_date?: string | null
          goal?: string | null
          id?: string
          internal_code?: string | null
          is_active?: boolean | null
          name: string
          notes?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          asset_url?: string | null
          audience?: string | null
          budget?: number | null
          channel?: string | null
          created_at?: string
          end_date?: string | null
          goal?: string | null
          id?: string
          internal_code?: string | null
          is_active?: boolean | null
          name?: string
          notes?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          birth_date: string | null
          city: string | null
          created_at: string
          created_by: string | null
          email: string | null
          event_type: string | null
          full_name: string
          id: string
          is_active: boolean
          is_returning: boolean
          is_vip: boolean
          language: string | null
          phone: string | null
          referred_by_employee_id: string | null
          referrer_name: string | null
          sector: string | null
          sizes: Json | null
          source: string | null
          style_notes: string | null
          tags: string[] | null
          updated_at: string
          whatsapp_group: boolean
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          event_type?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          is_returning?: boolean
          is_vip?: boolean
          language?: string | null
          phone?: string | null
          referred_by_employee_id?: string | null
          referrer_name?: string | null
          sector?: string | null
          sizes?: Json | null
          source?: string | null
          style_notes?: string | null
          tags?: string[] | null
          updated_at?: string
          whatsapp_group?: boolean
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          event_type?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          is_returning?: boolean
          is_vip?: boolean
          language?: string | null
          phone?: string | null
          referred_by_employee_id?: string | null
          referrer_name?: string | null
          sector?: string | null
          sizes?: Json | null
          source?: string | null
          style_notes?: string | null
          tags?: string[] | null
          updated_at?: string
          whatsapp_group?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "customers_referred_by_employee_id_fkey"
            columns: ["referred_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          employee_id: string
          expense_date: string
          id: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_id: string
          expense_date?: string
          id?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_id?: string
          expense_date?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_expenses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          commission_pct: number | null
          created_at: string
          email: string | null
          full_name: string
          hourly_rate: number | null
          id: string
          is_active: boolean
          is_commission_only: boolean | null
          monthly_salary: number | null
          phone: string | null
          position: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          commission_pct?: number | null
          created_at?: string
          email?: string | null
          full_name: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          is_commission_only?: boolean | null
          monthly_salary?: number | null
          phone?: string | null
          position?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          commission_pct?: number | null
          created_at?: string
          email?: string | null
          full_name?: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          is_commission_only?: boolean | null
          monthly_salary?: number | null
          phone?: string | null
          position?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          created_by: string | null
          description: string | null
          document_url: string | null
          expense_date: string
          id: string
          includes_vat: boolean
          installments: number | null
          is_paid: boolean
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          receipt_received: boolean | null
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_url?: string | null
          expense_date?: string
          id?: string
          includes_vat?: boolean
          installments?: number | null
          is_paid?: boolean
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          receipt_received?: boolean | null
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_url?: string | null
          expense_date?: string
          id?: string
          includes_vat?: boolean
          installments?: number | null
          is_paid?: boolean
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          receipt_received?: boolean | null
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          id: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          performed_by: string | null
          qty_after: number | null
          qty_before: number | null
          qty_change: number
          reason: string | null
          reference_id: string | null
          variant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          performed_by?: string | null
          qty_after?: number | null
          qty_before?: number | null
          qty_change: number
          reason?: string | null
          reference_id?: string | null
          variant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          movement_type?: Database["public"]["Enums"]["movement_type"]
          performed_by?: string | null
          qty_after?: number | null
          qty_before?: number | null
          qty_change?: number
          reason?: string | null
          reference_id?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          converted_customer_id: string | null
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          next_followup: string | null
          notes: string | null
          phone: string | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          converted_customer_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          id?: string
          next_followup?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          converted_customer_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          next_followup?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_converted_customer_id_fkey"
            columns: ["converted_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_incomes: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          includes_vat: boolean | null
          income_date: string
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          includes_vat?: boolean | null
          income_date?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          includes_vat?: boolean | null
          income_date?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
        }
        Relationships: []
      }
      newsletters: {
        Row: {
          audience_filter: string | null
          body_html: string
          created_at: string
          created_by: string | null
          id: string
          sent_at: string | null
          sent_count: number | null
          status: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          audience_filter?: string | null
          body_html: string
          created_at?: string
          created_by?: string | null
          id?: string
          sent_at?: string | null
          sent_count?: number | null
          status?: string | null
          subject: string
          updated_at?: string
        }
        Update: {
          audience_filter?: string | null
          body_html?: string
          created_at?: string
          created_by?: string | null
          id?: string
          sent_at?: string | null
          sent_count?: number | null
          status?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          color: string | null
          description: string | null
          id: string
          line_total: number | null
          order_id: string
          product_id: string | null
          qty: number | null
          size: string | null
          unit_price: number | null
        }
        Insert: {
          color?: string | null
          description?: string | null
          id?: string
          line_total?: number | null
          order_id: string
          product_id?: string | null
          qty?: number | null
          size?: string | null
          unit_price?: number | null
        }
        Update: {
          color?: string | null
          description?: string | null
          id?: string
          line_total?: number | null
          order_id?: string
          product_id?: string | null
          qty?: number | null
          size?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          delivery_date: string | null
          employee_id: string | null
          id: string
          notes: string | null
          order_number: number
          paid_amount: number | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          status: Database["public"]["Enums"]["order_status"]
          status_history: Json | null
          total: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          delivery_date?: string | null
          employee_id?: string | null
          id?: string
          notes?: string | null
          order_number?: number
          paid_amount?: number | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          status?: Database["public"]["Enums"]["order_status"]
          status_history?: Json | null
          total?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          delivery_date?: string | null
          employee_id?: string | null
          id?: string
          notes?: string | null
          order_number?: number
          paid_amount?: number | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          status?: Database["public"]["Enums"]["order_status"]
          status_history?: Json | null
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          barcode: string | null
          color: string | null
          created_at: string
          id: string
          min_stock_alert: number | null
          product_id: string
          size: string | null
          stock_qty: number
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          color?: string | null
          created_at?: string
          id?: string
          min_stock_alert?: number | null
          product_id: string
          size?: string | null
          stock_qty?: number
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          color?: string | null
          created_at?: string
          id?: string
          min_stock_alert?: number | null
          product_id?: string
          size?: string | null
          stock_qty?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          additional_images: string[] | null
          category: string | null
          collection: string | null
          cost_price: number | null
          created_at: string
          fabric_description: string | null
          id: string
          internal_name: string
          is_active: boolean
          main_image: string | null
          market: string | null
          promo_price: number | null
          sale_price: number
          season: string | null
          sku: string
          status: string | null
          subcategory: string | null
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          additional_images?: string[] | null
          category?: string | null
          collection?: string | null
          cost_price?: number | null
          created_at?: string
          fabric_description?: string | null
          id?: string
          internal_name: string
          is_active?: boolean
          main_image?: string | null
          market?: string | null
          promo_price?: number | null
          sale_price?: number
          season?: string | null
          sku: string
          status?: string | null
          subcategory?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          additional_images?: string[] | null
          category?: string | null
          collection?: string | null
          cost_price?: number | null
          created_at?: string
          fabric_description?: string | null
          id?: string
          internal_name?: string
          is_active?: boolean
          main_image?: string | null
          market?: string | null
          promo_price?: number | null
          sale_price?: number
          season?: string | null
          sku?: string
          status?: string | null
          subcategory?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          language: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          language?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          language?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      returns: {
        Row: {
          action_type: string
          created_at: string
          credit_issued: number | null
          customer_id: string | null
          exchanged_for: string | null
          handled_by: string | null
          id: string
          image_url: string | null
          product_condition: string | null
          reason: string | null
          refund_amount: number | null
          returned_to_stock: boolean | null
          sale_id: string | null
          status: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          credit_issued?: number | null
          customer_id?: string | null
          exchanged_for?: string | null
          handled_by?: string | null
          id?: string
          image_url?: string | null
          product_condition?: string | null
          reason?: string | null
          refund_amount?: number | null
          returned_to_stock?: boolean | null
          sale_id?: string | null
          status?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          credit_issued?: number | null
          customer_id?: string | null
          exchanged_for?: string | null
          handled_by?: string | null
          id?: string
          image_url?: string | null
          product_condition?: string | null
          reason?: string | null
          refund_amount?: number | null
          returned_to_stock?: boolean | null
          sale_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "returns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          color: string | null
          id: string
          line_discount: number | null
          line_total: number
          product_name: string
          qty: number
          sale_id: string
          size: string | null
          sku: string | null
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          color?: string | null
          id?: string
          line_discount?: number | null
          line_total?: number
          product_name: string
          qty?: number
          sale_id: string
          size?: string | null
          sku?: string | null
          unit_price?: number
          variant_id?: string | null
        }
        Update: {
          color?: string | null
          id?: string
          line_discount?: number | null
          line_total?: number
          product_name?: string
          qty?: number
          sale_id?: string
          size?: string | null
          sku?: string | null
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          discount: number
          discount_reason: string | null
          employee_id: string | null
          id: string
          installments: number | null
          is_cancelled: boolean
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          receipt_number: number
          subtotal: number
          total: number
          vat: number
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount?: number
          discount_reason?: string | null
          employee_id?: string | null
          id?: string
          installments?: number | null
          is_cancelled?: boolean
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          receipt_number?: number
          subtotal?: number
          total?: number
          vat?: number
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount?: number
          discount_reason?: string | null
          employee_id?: string | null
          id?: string
          installments?: number | null
          is_cancelled?: boolean
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          receipt_number?: number
          subtotal?: number
          total?: number
          vat?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_documents: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          id: string
          supplier_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          supplier_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          supplier_id?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          contact_name: string | null
          created_at: string
          email: string | null
          field: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          contact_name?: string | null
          created_at?: string
          email?: string | null
          field?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          contact_name?: string | null
          created_at?: string
          email?: string | null
          field?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          clock_in: string
          clock_out: string | null
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          overtime_minutes: number
          total_minutes: number | null
        }
        Insert: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          overtime_minutes?: number
          total_minutes?: number | null
        }
        Update: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          overtime_minutes?: number
          total_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "viewer" | "accounting" | "marketing"
      expense_category:
        | "production_current"
        | "production_next"
        | "rent"
        | "salary"
        | "marketing"
        | "branding"
        | "website"
        | "crm"
        | "processing_fees"
        | "insurance"
        | "technology"
        | "tax"
        | "loan"
        | "other"
      lead_status: "new" | "in_progress" | "converted" | "lost"
      movement_type:
        | "purchase"
        | "sale"
        | "exchange"
        | "return"
        | "adjustment"
        | "damage"
        | "transfer"
      order_status:
        | "pending"
        | "in_production"
        | "ready"
        | "awaiting_pickup"
        | "completed"
        | "cancelled"
      payment_method: "cash" | "credit" | "transfer" | "other"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "open" | "in_progress" | "done" | "waiting"
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
      app_role: ["admin", "staff", "viewer", "accounting", "marketing"],
      expense_category: [
        "production_current",
        "production_next",
        "rent",
        "salary",
        "marketing",
        "branding",
        "website",
        "crm",
        "processing_fees",
        "insurance",
        "technology",
        "tax",
        "loan",
        "other",
      ],
      lead_status: ["new", "in_progress", "converted", "lost"],
      movement_type: [
        "purchase",
        "sale",
        "exchange",
        "return",
        "adjustment",
        "damage",
        "transfer",
      ],
      order_status: [
        "pending",
        "in_production",
        "ready",
        "awaiting_pickup",
        "completed",
        "cancelled",
      ],
      payment_method: ["cash", "credit", "transfer", "other"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["open", "in_progress", "done", "waiting"],
    },
  },
} as const
