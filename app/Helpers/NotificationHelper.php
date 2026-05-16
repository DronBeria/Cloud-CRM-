<?php

namespace App\Helpers;

use App\Mail\Mail;
use App\Models\Notification;
use App\Models\NotificationTemplate;
use App\Models\User;
use Illuminate\Support\Facades\Mail as MailFacade;

class NotificationHelper
{
    public static function send(User $user, string $templateKey, array $data = []): void
    {
        $template = NotificationTemplate::where('key', $templateKey)->first();

        if (!$template) {
            return;
        }

        $preference = $user->notificationPreferences()->where('notification_template_id', $template->id)->first();

        if ($template->isEnabledForPreference($preference, 'mail')) {
            try {
                $mail = new Mail($template, array_merge($data, ['user' => $user]));
                $mail->to($user->email);
                if ($user->email_log_id ?? null) {
                    $mail->email_log_id = $user->email_log_id;
                }
                MailFacade::queue($mail);
            } catch (\Throwable $e) {
                report($e);
            }
        }

        if ($template->isEnabledForPreference($preference, 'app') && ($template->in_app_title || $template->in_app_body)) {
            try {
                $title = \Illuminate\View\Compilers\BladeCompiler::render($template->in_app_title ?? '', array_merge($data, ['user' => $user]));
                $body = \Illuminate\View\Compilers\BladeCompiler::render($template->in_app_body ?? '', array_merge($data, ['user' => $user]));
                Notification::create([
                    'user_id' => $user->id,
                    'title' => $title,
                    'body' => $body,
                    'url' => $data['url'] ?? null,
                ]);
            } catch (\Throwable $e) {
                report($e);
            }
        }
    }

    public static function invoiceCreatedNotification(User $user, $invoice): void
    {
        static::send($user, 'invoice_created', ['invoice' => $invoice]);
    }

    public static function invoicePaidNotification(User $user, $invoice): void
    {
        static::send($user, 'invoice_paid', ['invoice' => $invoice]);
    }

    public static function invoicePaymentFailedNotification(User $user, $invoice): void
    {
        static::send($user, 'invoice_payment_failed', ['invoice' => $invoice]);
    }

    public static function emailVerificationNotification(User $user): void
    {
        $user->sendEmailVerificationNotification();
    }

    public static function orderCreatedNotification(User $user, $order): void
    {
        static::send($user, 'order_created', ['order' => $order]);
    }

    public static function loginDetectedNotification(User $user, array $data): void
    {
        static::send($user, 'new_login_detected', $data);
    }

    public static function serviceCancellationReceivedNotification(User $user, $cancellation): void
    {
        static::send($user, 'service_cancellation_received', ['cancellation' => $cancellation]);
    }

    public static function ticketMessageNotification(User $user, $ticketMessage): void
    {
        static::send($user, 'ticket_reply', ['ticketMessage' => $ticketMessage]);
    }
}
