const {
  processOrder,
  generateInvoice,
  processRefund,
  getOrderSummary
} = require('../src/orderProcessor');

// ---------------------------------------------------------------------------
// Helpers — reusable fixtures
// ---------------------------------------------------------------------------

function makeOrder(overrides = {}) {
  return {
    customer: { name: 'Jane Doe', email: 'jane@example.com' },
    items: [
      { productId: 'WIDGET-1', name: 'Widget', quantity: 2, price: 25.00, weight: 0.5 }
    ],
    shippingAddress: { street: '123 Main St', city: 'Portland', state: 'OR', zip: '97201' },
    shippingMethod: 'standard',
    ...overrides
  };
}

function makeInventory(extra = {}) {
  return { 'WIDGET-1': 100, 'GADGET-2': 50, 'GIZMO-3': 10, ...extra };
}

function makeDiscountCodes() {
  return [
    { code: 'SAVE10', type: 'percentage', value: 10, active: true },
    { code: 'FLAT20', type: 'fixed', value: 20, active: true, minOrderAmount: 50 },
    { code: 'EXPIRED', type: 'percentage', value: 15, active: false },
    { code: 'BIG75', type: 'percentage', value: 75, active: true },
    { code: 'HUGEFLAT', type: 'fixed', value: 9999, active: true },
    { code: 'MIN100', type: 'fixed', value: 30, active: true, minOrderAmount: 100 },
  ];
}

// ---------------------------------------------------------------------------
// processOrder — validation
// ---------------------------------------------------------------------------

describe('processOrder', () => {
  describe('validation', () => {
    test('rejects null order', () => {
      const result = processOrder(null, {}, []);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/order is required/i);
    });

    test('rejects order with no items', () => {
      const result = processOrder({ items: [], customer: {}, shippingAddress: {} }, {}, []);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/at least one item/i);
    });

    test('rejects order without customer', () => {
      const result = processOrder({ items: [{ productId: 'X', quantity: 1, price: 10 }] }, {}, []);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/customer/i);
    });

    test('rejects order without customer email', () => {
      const order = makeOrder({ customer: { name: 'Jane' } });
      const result = processOrder(order, makeInventory(), []);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/email/i);
    });

    test('rejects order without customer name', () => {
      const order = makeOrder({ customer: { email: 'j@j.com' } });
      const result = processOrder(order, makeInventory(), []);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/name/i);
    });

    test('rejects order without shipping address', () => {
      const order = { items: [{ productId: 'WIDGET-1', quantity: 1, price: 10 }], customer: { name: 'J', email: 'j@j.com' } };
      const result = processOrder(order, makeInventory(), []);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/shipping address/i);
    });

    test('rejects incomplete shipping address', () => {
      const order = makeOrder({ shippingAddress: { street: '123 Main', city: 'Portland' } });
      const result = processOrder(order, makeInventory(), []);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/complete shipping address/i);
    });

    test('rejects item without productId', () => {
      const order = makeOrder({ items: [{ quantity: 1, price: 10 }] });
      const result = processOrder(order, makeInventory(), []);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/productId/i);
    });

    test('rejects item with zero quantity', () => {
      const order = makeOrder({ items: [{ productId: 'WIDGET-1', quantity: 0, price: 10 }] });
      const result = processOrder(order, makeInventory(), []);
      expect(result.success).toBe(false);
    });

    test('rejects item with non-positive price', () => {
      const order = makeOrder({ items: [{ productId: 'WIDGET-1', quantity: 1, price: 0 }] });
      const result = processOrder(order, makeInventory(), []);
      expect(result.success).toBe(false);
    });
  });

  describe('inventory checks', () => {
    test('rejects order when product not in inventory', () => {
      const order = makeOrder({ items: [{ productId: 'MISSING', quantity: 1, price: 10 }] });
      const result = processOrder(order, makeInventory(), []);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found in inventory/i);
    });

    test('rejects order when insufficient inventory', () => {
      const order = makeOrder({ items: [{ productId: 'GIZMO-3', quantity: 999, price: 10 }] });
      const result = processOrder(order, makeInventory(), []);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/insufficient inventory/i);
    });

    test('processes order when no inventory map is provided (skip check)', () => {
      const order = makeOrder();
      const result = processOrder(order, null, []);
      expect(result.success).toBe(true);
    });
  });

  describe('pricing calculations', () => {
    test('calculates correct subtotal', () => {
      const order = makeOrder({
        items: [
          { productId: 'WIDGET-1', quantity: 3, price: 10.00, weight: 0.5 },
          { productId: 'GADGET-2', quantity: 1, price: 45.00, weight: 1.0 }
        ]
      });
      const result = processOrder(order, makeInventory(), []);
      expect(result.success).toBe(true);
      expect(result.order.subtotal).toBe(75.00);
    });

    test('applies percentage discount', () => {
      const order = makeOrder({ discountCode: 'SAVE10' });
      const result = processOrder(order, makeInventory(), makeDiscountCodes());
      expect(result.success).toBe(true);
      expect(result.order.discount.code).toBe('SAVE10');
      expect(result.order.discount.amount).toBe(5.00); // 10% of 50
    });

    test('applies fixed discount', () => {
      const order = makeOrder({
        discountCode: 'FLAT20',
        items: [{ productId: 'WIDGET-1', quantity: 3, price: 25.00, weight: 0.5 }]
      });
      const result = processOrder(order, makeInventory(), makeDiscountCodes());
      expect(result.success).toBe(true);
      expect(result.order.discount.amount).toBe(20.00);
    });

    test('caps percentage discount at 50% of subtotal', () => {
      const order = makeOrder({ discountCode: 'BIG75' }); // 75% discount
      const result = processOrder(order, makeInventory(), makeDiscountCodes());
      expect(result.success).toBe(true);
      // subtotal is 50, 75% would be 37.50, cap is 25 (50%)
      expect(result.order.discount.amount).toBe(25.00);
    });

    test('caps fixed discount at subtotal', () => {
      const order = makeOrder({ discountCode: 'HUGEFLAT' }); // $9999 off
      const result = processOrder(order, makeInventory(), makeDiscountCodes());
      expect(result.success).toBe(true);
      expect(result.order.discount.amount).toBe(50.00); // subtotal is 50
    });

    test('ignores inactive discount code', () => {
      const order = makeOrder({ discountCode: 'EXPIRED' });
      const result = processOrder(order, makeInventory(), makeDiscountCodes());
      expect(result.success).toBe(true);
      expect(result.order.discount).toBeNull();
    });

    test('ignores discount code when order below minimum', () => {
      const order = makeOrder({ discountCode: 'MIN100' }); // min $100
      const result = processOrder(order, makeInventory(), makeDiscountCodes());
      expect(result.success).toBe(true);
      expect(result.order.discount).toBeNull();
    });
  });

  describe('tax calculation', () => {
    test('applies CA tax rate', () => {
      const order = makeOrder({ shippingAddress: { street: '1 A', city: 'LA', state: 'CA', zip: '90001' } });
      const result = processOrder(order, makeInventory(), []);
      expect(result.order.tax.rate).toBe(0.0725);
    });

    test('applies NY tax rate', () => {
      const order = makeOrder({ shippingAddress: { street: '1 A', city: 'NYC', state: 'NY', zip: '10001' } });
      const result = processOrder(order, makeInventory(), []);
      expect(result.order.tax.rate).toBe(0.08);
    });

    test('zero tax for OR', () => {
      const order = makeOrder(); // default is OR
      const result = processOrder(order, makeInventory(), []);
      expect(result.order.tax.rate).toBe(0);
      expect(result.order.tax.amount).toBe(0);
    });

    test('default tax rate for unlisted state', () => {
      const order = makeOrder({ shippingAddress: { street: '1 A', city: 'Denver', state: 'CO', zip: '80201' } });
      const result = processOrder(order, makeInventory(), []);
      expect(result.order.tax.rate).toBe(0.05);
    });
  });

  describe('shipping calculation', () => {
    test('free shipping when after-discount total >= $100', () => {
      const order = makeOrder({
        items: [{ productId: 'WIDGET-1', quantity: 5, price: 25.00, weight: 0.5 }]
      });
      const result = processOrder(order, makeInventory(), []);
      expect(result.order.shipping.cost).toBe(0);
    });

    test('charges standard shipping for light packages', () => {
      const order = makeOrder({
        items: [{ productId: 'WIDGET-1', quantity: 1, price: 10.00, weight: 0.3 }]
      });
      const result = processOrder(order, makeInventory(), []);
      expect(result.order.shipping.cost).toBe(5.99);
    });

    test('express shipping doubles cost multiplier', () => {
      const order = makeOrder({
        shippingMethod: 'express',
        items: [{ productId: 'WIDGET-1', quantity: 1, price: 10.00, weight: 0.3 }]
      });
      const result = processOrder(order, makeInventory(), []);
      expect(result.order.shipping.cost).toBe(14.98); // 5.99 * 2.5
    });

    test('overnight shipping quadruples cost', () => {
      const order = makeOrder({
        shippingMethod: 'overnight',
        items: [{ productId: 'WIDGET-1', quantity: 1, price: 10.00, weight: 0.3 }]
      });
      const result = processOrder(order, makeInventory(), []);
      expect(result.order.shipping.cost).toBe(23.96); // 5.99 * 4
    });

    test('total is sum of post-discount subtotal, tax, and shipping', () => {
      const order = makeOrder(); // OR, standard, subtotal 50, no discount
      const result = processOrder(order, makeInventory(), []);
      expect(result.order.total).toBe(50 + 0 + 5.99); // subtotal + tax(0) + shipping
    });
  });
});

// ---------------------------------------------------------------------------
// generateInvoice
// ---------------------------------------------------------------------------

describe('generateInvoice', () => {
  test('returns null for null input', () => {
    expect(generateInvoice(null)).toBeNull();
  });

  test('contains order id', () => {
    const order = makeOrder();
    const processed = processOrder(order, makeInventory(), []).order;
    const invoice = generateInvoice(processed);
    expect(invoice).toContain(processed.orderId);
  });

  test('contains customer name and email', () => {
    const order = makeOrder();
    const processed = processOrder(order, makeInventory(), []).order;
    const invoice = generateInvoice(processed);
    expect(invoice).toContain('Jane Doe');
    expect(invoice).toContain('jane@example.com');
  });

  test('lists each item with correct total', () => {
    const order = makeOrder({
      items: [
        { productId: 'WIDGET-1', name: 'Widget', quantity: 2, price: 25.00, weight: 0.5 },
        { productId: 'GADGET-2', name: 'Gadget', quantity: 1, price: 30.00, weight: 1.0 }
      ]
    });
    const processed = processOrder(order, makeInventory(), []).order;
    const invoice = generateInvoice(processed);
    expect(invoice).toContain('Widget');
    expect(invoice).toContain('$50.00');
    expect(invoice).toContain('Gadget');
    expect(invoice).toContain('$30.00');
  });

  test('shows discount when present', () => {
    const order = makeOrder({ discountCode: 'SAVE10' });
    const processed = processOrder(order, makeInventory(), makeDiscountCodes()).order;
    const invoice = generateInvoice(processed);
    expect(invoice).toContain('SAVE10');
    expect(invoice).toContain('$5.00');
  });
});

// ---------------------------------------------------------------------------
// processRefund
// ---------------------------------------------------------------------------

describe('processRefund', () => {
  function makeProcessedOrder(statusOverride = 'delivered', overrides = {}) {
    return {
      orderId: 'ORD-123',
      total: 100.00,
      subtotal: 80.00,
      status: statusOverride,
      shipping: { method: 'standard', cost: 9.99 },
      ...overrides
    };
  }

  test('rejects null order', () => {
    const result = processRefund(null, 'damaged');
    expect(result.success).toBe(false);
  });

  test('rejects missing reason', () => {
    const result = processRefund(makeProcessedOrder(), null);
    expect(result.success).toBe(false);
  });

  test('rejects ineligible status', () => {
    const result = processRefund(makeProcessedOrder('pending'), 'damaged');
    expect(result.success).toBe(false);
  });

  test('full refund for damaged delivered item', () => {
    const result = processRefund(makeProcessedOrder('delivered'), 'damaged');
    expect(result.success).toBe(true);
    expect(result.refund.refundAmount).toBe(100.00);
    expect(result.refund.refundType).toBe('full');
  });

  test('partial refund for changed_mind delivered item (15% restocking)', () => {
    const result = processRefund(makeProcessedOrder('delivered'), 'changed_mind');
    expect(result.success).toBe(true);
    // 100 - (80*0.15) - 9.99 = 100 - 12 - 9.99 = 78.01
    expect(result.refund.refundAmount).toBe(78.01);
    expect(result.refund.refundType).toBe('partial');
  });

  test('partial refund for changed_mind shipped item (10% restocking)', () => {
    const result = processRefund(makeProcessedOrder('shipped'), 'changed_mind');
    expect(result.success).toBe(true);
    // 100 - (80*0.10) - 9.99 = 100 - 8 - 9.99 = 82.01
    expect(result.refund.refundAmount).toBe(82.01);
    expect(result.refund.refundType).toBe('partial');
  });

  test('cancellation refund for processed order', () => {
    const result = processRefund(makeProcessedOrder('processed'), 'changed_mind');
    expect(result.success).toBe(true);
    expect(result.refund.refundAmount).toBe(90.01); // 100 - 9.99
    expect(result.refund.refundType).toBe('cancellation');
  });

  test('50% refund for late express delivery', () => {
    const order = makeProcessedOrder('delivered', { shipping: { method: 'express', cost: 20 } });
    const result = processRefund(order, 'late_delivery');
    expect(result.success).toBe(true);
    expect(result.refund.refundAmount).toBe(50.00);
  });

  test('full refund for late overnight delivery', () => {
    const order = makeProcessedOrder('delivered', { shipping: { method: 'overnight', cost: 40 } });
    const result = processRefund(order, 'late_delivery');
    expect(result.success).toBe(true);
    expect(result.refund.refundAmount).toBe(100.00);
    expect(result.refund.refundType).toBe('full');
  });

  test('rejects late_delivery claim for undelivered order', () => {
    const result = processRefund(makeProcessedOrder('shipped'), 'late_delivery');
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getOrderSummary
// ---------------------------------------------------------------------------

describe('getOrderSummary', () => {
  test('returns zeros for empty array', () => {
    const summary = getOrderSummary([]);
    expect(summary.totalOrders).toBe(0);
    expect(summary.totalRevenue).toBe(0);
    expect(summary.averageOrderValue).toBe(0);
  });

  test('returns zeros for null input', () => {
    const summary = getOrderSummary(null);
    expect(summary.totalOrders).toBe(0);
  });

  test('correctly aggregates multiple orders', () => {
    const orders = [
      {
        total: 100, subtotal: 80, status: 'delivered',
        tax: { amount: 5 }, shipping: { cost: 10 }, discount: { amount: 5 },
        items: [{ productId: 'A', quantity: 2, price: 40 }],
        shippingAddress: { state: 'CA' }
      },
      {
        total: 50, subtotal: 40, status: 'processed',
        tax: { amount: 2 }, shipping: { cost: 5 }, discount: null,
        items: [{ productId: 'B', quantity: 1, price: 40 }],
        shippingAddress: { state: 'NY' }
      }
    ];
    const summary = getOrderSummary(orders);
    expect(summary.totalOrders).toBe(2);
    expect(summary.totalRevenue).toBe(150);
    expect(summary.averageOrderValue).toBe(75);
    expect(summary.totalItemsSold).toBe(3);
    expect(summary.totalTaxCollected).toBe(7);
    expect(summary.totalShippingCollected).toBe(15);
    expect(summary.totalDiscountsGiven).toBe(5);
    expect(summary.ordersByStatus).toEqual({ delivered: 1, processed: 1 });
  });

  test('top products sorted by quantity descending', () => {
    const orders = [
      {
        total: 100, status: 'delivered', tax: { amount: 0 }, shipping: { cost: 0 },
        items: [
          { productId: 'A', quantity: 1, price: 10 },
          { productId: 'B', quantity: 5, price: 20 }
        ],
        shippingAddress: { state: 'OR' }
      }
    ];
    const summary = getOrderSummary(orders);
    expect(summary.topProducts[0].productId).toBe('B');
    expect(summary.topProducts[0].quantitySold).toBe(5);
    expect(summary.topProducts[1].productId).toBe('A');
  });

  test('revenue by state is correct', () => {
    const orders = [
      { total: 60, status: 'processed', tax: { amount: 0 }, shipping: { cost: 0 }, items: [{ productId: 'A', quantity: 1, price: 60 }], shippingAddress: { state: 'CA' } },
      { total: 40, status: 'processed', tax: { amount: 0 }, shipping: { cost: 0 }, items: [{ productId: 'A', quantity: 1, price: 40 }], shippingAddress: { state: 'CA' } },
      { total: 25, status: 'processed', tax: { amount: 0 }, shipping: { cost: 0 }, items: [{ productId: 'A', quantity: 1, price: 25 }], shippingAddress: { state: 'NY' } },
    ];
    const summary = getOrderSummary(orders);
    expect(summary.revenueByState['CA']).toBe(100);
    expect(summary.revenueByState['NY']).toBe(25);
  });
});
