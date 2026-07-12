import { supabase } from "@/lib/supabaseClient";

export async function uploadFile(file, folder = "misc") {
  const ext = file.name.split(".").pop();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("uploads").upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("uploads").getPublicUrl(path);
  return { file_url: data.publicUrl };
}
