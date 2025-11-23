import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const brevoApiKey = Deno.env.get('BREVO_API_KEY')!;
const brevoSenderEmail = Deno.env.get('BREVO_SENDER_EMAIL')!;
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  professionalId: string;
  to: string;
  subject: string;
  htmlContent: string;
  emailType: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { professionalId, to, subject, htmlContent, emailType }: EmailRequest = await req.json();

    console.log('Sending email via Brevo for professional:', professionalId);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if professional has enough credits
    const { data: credits, error: creditsError } = await supabase
      .from('email_credits')
      .select('credits')
      .eq('master_id', professionalId)
      .single();

    if (creditsError || !credits || credits.credits < 1) {
      console.error('Insufficient email credits');
      return new Response(
        JSON.stringify({ error: 'Insufficient email credits' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send email via Brevo API v3
    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          email: brevoSenderEmail,
          name: 'BeautyOn'
        },
        to: [{ email: to }],
        subject: subject,
        htmlContent: htmlContent
      })
    });

    if (!brevoResponse.ok) {
      const errorData = await brevoResponse.json();
      console.error('Brevo API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: errorData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const responseData = await brevoResponse.json();
    console.log('Email sent successfully, message ID:', responseData.messageId);

    // Deduct 1 credit
    await supabase
      .from('email_credits')
      .update({ 
        credits: credits.credits - 1,
        updated_at: new Date().toISOString()
      })
      .eq('master_id', professionalId);

    // Log email usage
    await supabase
      .from('email_logs')
      .insert({
        professional_id: professionalId,
        recipient_email: to,
        email_type: emailType,
        status: 'sent',
        brevo_message_id: responseData.messageId
      });

    // Track in email_usage table as well
    await supabase
      .from('email_usage')
      .insert({
        master_id: professionalId,
        recipient: to,
        type: emailType
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: responseData.messageId,
        creditsRemaining: credits.credits - 1
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Email sending error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
