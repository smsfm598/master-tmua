import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { hasFullAccess: false },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from("user_entitlements")
    .select("has_full_access, purchase_date")
    .eq("clerk_user_id", userId)
    .single();

  if (error) {
    return NextResponse.json({
      hasFullAccess: false
    });
  }

  return NextResponse.json({
    hasFullAccess: data.has_full_access,
    purchaseDate: data.purchase_date
  });
}