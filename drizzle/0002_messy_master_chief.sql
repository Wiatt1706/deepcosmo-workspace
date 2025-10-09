CREATE TABLE "system_menu" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"url" varchar(1024),
	"icon" varchar(255),
	"shortcut" text[],
	"is_active" boolean DEFAULT false NOT NULL,
	"parent_id" uuid,
	"menu_type" varchar(30) DEFAULT '0' NOT NULL,
	"menu_sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
