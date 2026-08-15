import { useQuery } from "@tanstack/react-query";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-provider";
import { getContactInfo } from "@workspace/db/contact-info";
import { CONTACT } from "@/data/portfolio";
import type { ContactInfo } from "@/features/contact/types";

export function useContact() {
  const { data: contactData } = useQuery({
    queryKey: ["contactInfo"],
    queryFn: () => {
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase not configured");
      return getContactInfo(supabase);
    },
    staleTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    enabled: isSupabaseConfigured,
  });

  const contact: ContactInfo = contactData
    ? {
        email: contactData.email ?? CONTACT.email,
        phone: contactData.phone ?? CONTACT.phone,
        location: contactData.location ?? CONTACT.location,
        github: contactData.github ?? CONTACT.github,
        linkedin: contactData.linkedin ?? CONTACT.linkedin,
        whatsapp: contactData.whatsapp ?? CONTACT.whatsapp,
      }
    : CONTACT;

  return { contact };
}
