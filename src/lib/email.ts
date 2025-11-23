import { supabase } from '@/integrations/supabase/client';

export interface SendEmailParams {
  professionalId: string;
  to: string;
  subject: string;
  htmlContent: string;
  emailType: 'booking_confirmation' | 'booking_reminder' | 'booking_cancellation' | 'system' | 'verification';
}

export async function sendEmail(params: SendEmailParams) {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: params
    });

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}

export function generateBookingConfirmationEmail(
  clientName: string,
  professionalName: string,
  serviceName: string,
  bookingDate: string,
  bookingTime: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #000; color: #fff; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f9f9f9; }
        .details { background: #fff; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .button { display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>BeautyOn</h1>
        </div>
        <div class="content">
          <h2>Rezervācija apstiprināta!</h2>
          <p>Sveiki, ${clientName}!</p>
          <p>Jūsu rezervācija ir veiksmīgi apstiprināta.</p>
          
          <div class="details">
            <h3>Rezervācijas detaļas</h3>
            <p><strong>Meistars:</strong> ${professionalName}</p>
            <p><strong>Pakalpojums:</strong> ${serviceName}</p>
            <p><strong>Datums:</strong> ${bookingDate}</p>
            <p><strong>Laiks:</strong> ${bookingTime}</p>
          </div>
          
          <p>Ja nepieciešams atcelt vai mainīt rezervāciju, lūdzu, sazinieties ar meistaru savlaicīgi.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} BeautyOn. Skaistumkopšanas pakalpojumu platforma.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generateBookingReminderEmail(
  clientName: string,
  professionalName: string,
  serviceName: string,
  bookingDate: string,
  bookingTime: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #000; color: #fff; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f9f9f9; }
        .details { background: #fff; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>BeautyOn</h1>
        </div>
        <div class="content">
          <h2>Atgādinājums par rezervāciju</h2>
          <p>Sveiki, ${clientName}!</p>
          <p>Atgādinām par Jūsu tuvāko rezervāciju.</p>
          
          <div class="details">
            <h3>Rezervācijas detaļas</h3>
            <p><strong>Meistars:</strong> ${professionalName}</p>
            <p><strong>Pakalpojums:</strong> ${serviceName}</p>
            <p><strong>Datums:</strong> ${bookingDate}</p>
            <p><strong>Laiks:</strong> ${bookingTime}</p>
          </div>
          
          <p>Ceram Jūs redzēt!</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} BeautyOn. Skaistumkopšanas pakalpojumu platforma.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
