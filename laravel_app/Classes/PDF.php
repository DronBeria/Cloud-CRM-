<?php

namespace App\Classes;

use App\Models\Invoice;
use Barryvdh\DomPDF\Facade\Pdf;

class PDF
{
    public static function generateInvoice(Invoice $invoice): string
    {
        $pdf = Pdf::loadView('pdf.invoice', ['invoice' => $invoice]);

        return $pdf->output();
    }
}
