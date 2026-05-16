<?php

namespace App\Http\Middleware;

use App\Classes\Cart;
use App\Exceptions\DisplayException;
use App\Models\Currency;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckoutParameterMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $this->handleCurrencySwitch($request);
        $this->handleCouponApplication($request);

        return $next($request);
    }

    private function handleCurrencySwitch(Request $request): void
    {
        if (!$request->has('currency')) {
            return;
        }

        $currencyCode = $request->input('currency');

        if ($this->shouldBlockCurrencyChange($currencyCode)) {
            return;
        }

        session(['currency' => $currencyCode]);
    }

    private function handleCouponApplication(Request $request): void
    {
        if (!$request->has('coupon')) {
            return;
        }

        try {
            Cart::applyCoupon($request->input('coupon'));
        } catch (DisplayException $e) {
            return;
        }
    }

    private function shouldBlockCurrencyChange(string $currencyCode): bool
    {
        return Cart::items()->count() > 0 ||
            Currency::where('code', $currencyCode)->doesntExist();
    }
}
