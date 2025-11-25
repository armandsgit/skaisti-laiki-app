import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface HandleExceptionRequest {
  exceptionId: string;
  action: "created" | "deleted";
  exception: {
    exception_date: string;
    is_closed: boolean;
    professional_id: string;
    staff_member_id?: string;
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { exceptionId, action, exception }: HandleExceptionRequest = await req.json();

    console.log(`Processing schedule exception: ${action}`, { exceptionId, exception });

    let bookings: any[] = [];

    // Only process if exception is marked as closed and action is created
    if (action === "created" && exception.is_closed) {
      console.log(`Exception is closed - cancelling all bookings for ${exception.exception_date}`);

      // Get all pending/confirmed bookings for this date and professional
      let query = supabase
        .from("bookings")
        .select(`
          *,
          client:profiles!client_id(id, name, email),
          professional:professional_profiles!professional_id(
            id,
            user:profiles!user_id(id, name, email)
          ),
          service:services!service_id(id, name)
        `)
        .eq("professional_id", exception.professional_id)
        .eq("booking_date", exception.exception_date)
        .in("status", ["pending", "confirmed"]);

      if (exception.staff_member_id) {
        query = query.eq("staff_member_id", exception.staff_member_id);
      }

      const { data: fetchedBookings, error: bookingsError } = await query;
      bookings = fetchedBookings || [];

      if (bookingsError) {
        console.error("Error fetching bookings:", bookingsError);
        throw bookingsError;
      }

      console.log(`Found ${bookings?.length || 0} bookings to cancel`);

      if (bookings && bookings.length > 0) {
        // Cancel all bookings with proper tracking
        const bookingIds = bookings.map(b => b.id);
        
        const { error: updateError } = await supabase
          .from("bookings")
          .update({
            status: "cancelled_system",
            auto_cancelled_by_exception: true,
            cancelled_at: new Date().toISOString(),
            cancellation_reason: "Slēgta diena",
          })
          .in("id", bookingIds);

        if (updateError) {
          console.error("Error cancelling bookings:", updateError);
          throw updateError;
        }

        console.log(`Successfully cancelled ${bookings.length} bookings`);

        // Send email notifications to clients
        const brevoApiKey = Deno.env.get("BREVO_API_KEY");
        const brevoSenderEmail = Deno.env.get("BREVO_SENDER_EMAIL");

        if (brevoApiKey && brevoSenderEmail) {
          for (const booking of bookings) {
            try {
              const clientEmail = (booking.client as any)?.email;
              const clientName = (booking.client as any)?.name;
              const professionalName = (booking.professional as any)?.user?.name;
              const serviceName = (booking.service as any)?.name;

              if (!clientEmail) {
                console.log(`No email for client ${booking.client_id}, skipping`);
                continue;
              }

              // Format date
              const bookingDate = new Date(booking.booking_date);
              const formattedDate = bookingDate.toLocaleDateString("lv-LV", {
                year: "numeric",
                month: "long",
                day: "numeric"
              });

              // Send email via Brevo
              const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
                method: "POST",
                headers: {
                  "accept": "application/json",
                  "api-key": brevoApiKey,
                  "content-type": "application/json",
                },
                body: JSON.stringify({
                  sender: {
                    name: "BeautyOn",
                    email: brevoSenderEmail,
                  },
                  to: [
                    {
                      email: clientEmail,
                      name: clientName,
                    },
                  ],
                  subject: "Rezervācija atcelta - BeautyOn",
                  htmlContent: `
                    <html>
                      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                          <h2 style="color: #ec4899; border-bottom: 2px solid #ec4899; padding-bottom: 10px;">
                            Rezervācija atcelta
                          </h2>
                          <p>Sveiki, ${clientName}!</p>
                          <p>Diemžēl jūsu rezervācija ir atcelta, jo meistars ir slēdzis darba vietu šajā dienā.</p>
                          
                          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #6b7280;">Rezervācijas detaļas:</h3>
                            <p style="margin: 5px 0;"><strong>Meistars:</strong> ${professionalName}</p>
                            <p style="margin: 5px 0;"><strong>Pakalpojums:</strong> ${serviceName}</p>
                            <p style="margin: 5px 0;"><strong>Datums:</strong> ${formattedDate}</p>
                            <p style="margin: 5px 0;"><strong>Laiks:</strong> ${booking.booking_time}</p>
                          </div>
                          
                          <p>Lūdzu, izvēlieties citu datumu, lai veiktu rezervāciju.</p>
                          
                          <p style="margin-top: 30px;">Ar cieņu,<br><strong>BeautyOn komanda</strong></p>
                        </div>
                      </body>
                    </html>
                  `,
                }),
              });

              if (!brevoResponse.ok) {
                const errorText = await brevoResponse.text();
                console.error(`Failed to send email to ${clientEmail}:`, errorText);
              } else {
                const brevoData = await brevoResponse.json();
                console.log(`Email sent to ${clientEmail}, messageId: ${brevoData.messageId}`);

                // Log email
                await supabase.from("email_logs").insert({
                  professional_id: exception.professional_id,
                  recipient_email: clientEmail,
                  email_type: "booking_cancelled_exception",
                  status: "sent",
                  brevo_message_id: brevoData.messageId,
                });
              }
            } catch (emailError) {
              console.error(`Error sending email for booking ${booking.id}:`, emailError);
            }
          }
        } else {
          console.log("Brevo not configured, skipping email notifications");
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        bookingsCancelled: action === "created" && exception.is_closed ? bookings?.length || 0 : 0 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in handle-schedule-exception:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});