<?php

namespace App\Classes\Extension;

use App\Models\BillingAgreement;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Support\Facades\View;

abstract class Gateway extends Extension
{
    /**
     * Pay the given invoice with the given total amount.
     *
     * @param  mixed  $total
     * @return View|string
     */
    abstract public function pay(Invoice $invoice, $total);

    public function supportsBillingAgreements(): bool
    {
        return false;
    }

    public function createBillingAgreement(User $user)
    {
        throw new \Exception('Not implemented');
    }

    public function cancelBillingAgreement(BillingAgreement $billingAgreement): bool
    {
        throw new \Exception('Not implemented');
    }

    public function charge(Invoice $invoice, $total, BillingAgreement $billingAgreement)
    {
        throw new \Exception('Not implemented');
    }
}
