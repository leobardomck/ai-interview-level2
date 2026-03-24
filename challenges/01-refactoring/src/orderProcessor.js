/**
 * Order Processor Module
 * Handles e-commerce order processing, invoicing, refunds, and summaries.
 *
 * NOTE: This code works. All tests pass. But it could use some love.
 */

function processOrder(order, inventory, discountCodes) {
  // validate the order first
  if (!order) {
    return { success: false, error: 'Order is required' };
  }
  if (!order.items || order.items.length === 0) {
    return { success: false, error: 'Order must have at least one item' };
  }
  if (!order.customer) {
    return { success: false, error: 'Customer information is required' };
  }
  if (!order.customer.email) {
    return { success: false, error: 'Customer email is required' };
  }
  if (!order.customer.name) {
    return { success: false, error: 'Customer name is required' };
  }
  if (!order.shippingAddress) {
    return { success: false, error: 'Shipping address is required' };
  }
  if (!order.shippingAddress.street || !order.shippingAddress.city || !order.shippingAddress.state || !order.shippingAddress.zip) {
    return { success: false, error: 'Complete shipping address is required' };
  }

  // check inventory for all items
  for (let i = 0; i < order.items.length; i++) {
    if (!order.items[i].productId) {
      return { success: false, error: 'Each item must have a productId' };
    }
    if (!order.items[i].quantity || order.items[i].quantity < 1) {
      return { success: false, error: 'Each item must have a quantity of at least 1' };
    }
    if (!order.items[i].price || order.items[i].price <= 0) {
      return { success: false, error: 'Each item must have a positive price' };
    }
    if (inventory) {
      if (inventory[order.items[i].productId] !== undefined) {
        if (inventory[order.items[i].productId] < order.items[i].quantity) {
          return { success: false, error: 'Insufficient inventory for product: ' + order.items[i].productId };
        }
      } else {
        return { success: false, error: 'Product not found in inventory: ' + order.items[i].productId };
      }
    }
  }

  // calculate subtotal
  let subtotal = 0;
  for (let i = 0; i < order.items.length; i++) {
    subtotal += order.items[i].price * order.items[i].quantity;
  }

  // apply discount if provided
  let discountAmount = 0;
  let appliedDiscount = null;
  if (order.discountCode && discountCodes) {
    for (let i = 0; i < discountCodes.length; i++) {
      if (discountCodes[i].code === order.discountCode) {
        if (discountCodes[i].active) {
          if (discountCodes[i].minOrderAmount === undefined || subtotal >= discountCodes[i].minOrderAmount) {
            if (discountCodes[i].type === 'percentage') {
              discountAmount = subtotal * (discountCodes[i].value / 100);
              // cap percentage discounts at 50% of subtotal
              if (discountAmount > subtotal * 0.5) {
                discountAmount = subtotal * 0.5;
              }
              appliedDiscount = discountCodes[i];
            } else if (discountCodes[i].type === 'fixed') {
              discountAmount = discountCodes[i].value;
              // fixed discount can't exceed subtotal
              if (discountAmount > subtotal) {
                discountAmount = subtotal;
              }
              appliedDiscount = discountCodes[i];
            }
          }
        }
      }
    }
  }

  let afterDiscount = subtotal - discountAmount;

  // calculate tax based on state
  let taxRate = 0;
  if (order.shippingAddress.state === 'CA') {
    taxRate = 0.0725;
  } else if (order.shippingAddress.state === 'NY') {
    taxRate = 0.08;
  } else if (order.shippingAddress.state === 'TX') {
    taxRate = 0.0625;
  } else if (order.shippingAddress.state === 'FL') {
    taxRate = 0.06;
  } else if (order.shippingAddress.state === 'WA') {
    taxRate = 0.065;
  } else if (order.shippingAddress.state === 'OR') {
    taxRate = 0;
  } else if (order.shippingAddress.state === 'MT') {
    taxRate = 0;
  } else if (order.shippingAddress.state === 'NH') {
    taxRate = 0;
  } else {
    taxRate = 0.05;
  }

  let taxAmount = afterDiscount * taxRate;
  taxAmount = Math.round(taxAmount * 100) / 100;

  // calculate shipping
  let shippingCost = 0;
  let totalWeight = 0;
  for (let i = 0; i < order.items.length; i++) {
    totalWeight += (order.items[i].weight || 0.5) * order.items[i].quantity;
  }
  if (afterDiscount >= 100) {
    shippingCost = 0; // free shipping over $100
  } else if (totalWeight <= 1) {
    shippingCost = 5.99;
  } else if (totalWeight <= 5) {
    shippingCost = 9.99;
  } else if (totalWeight <= 20) {
    shippingCost = 14.99;
  } else {
    shippingCost = 14.99 + (totalWeight - 20) * 0.75;
  }

  if (order.shippingMethod === 'express') {
    shippingCost = shippingCost * 2.5;
  } else if (order.shippingMethod === 'overnight') {
    shippingCost = shippingCost * 4;
  }

  shippingCost = Math.round(shippingCost * 100) / 100;

  let total = afterDiscount + taxAmount + shippingCost;
  total = Math.round(total * 100) / 100;

  // build the processed order
  let processedOrder = {
    orderId: 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
    customer: order.customer,
    items: order.items,
    shippingAddress: order.shippingAddress,
    shippingMethod: order.shippingMethod || 'standard',
    subtotal: Math.round(subtotal * 100) / 100,
    discount: appliedDiscount ? {
      code: appliedDiscount.code,
      type: appliedDiscount.type,
      value: appliedDiscount.value,
      amount: Math.round(discountAmount * 100) / 100
    } : null,
    tax: {
      rate: taxRate,
      amount: taxAmount
    },
    shipping: {
      method: order.shippingMethod || 'standard',
      cost: shippingCost,
      weight: Math.round(totalWeight * 100) / 100
    },
    total: total,
    status: 'processed',
    createdAt: new Date().toISOString()
  };

  return { success: true, order: processedOrder };
}


function generateInvoice(processedOrder) {
  if (!processedOrder) {
    return null;
  }

  let lines = [];
  lines.push('========================================');
  lines.push('              INVOICE                   ');
  lines.push('========================================');
  lines.push('Order ID: ' + processedOrder.orderId);
  lines.push('Date: ' + processedOrder.createdAt);
  lines.push('');
  lines.push('Customer: ' + processedOrder.customer.name);
  lines.push('Email: ' + processedOrder.customer.email);
  lines.push('');
  lines.push('Ship To:');
  lines.push('  ' + processedOrder.shippingAddress.street);
  lines.push('  ' + processedOrder.shippingAddress.city + ', ' + processedOrder.shippingAddress.state + ' ' + processedOrder.shippingAddress.zip);
  lines.push('');
  lines.push('Items:');
  lines.push('----------------------------------------');

  for (let i = 0; i < processedOrder.items.length; i++) {
    let item = processedOrder.items[i];
    let itemTotal = item.price * item.quantity;
    lines.push('  ' + (item.name || item.productId) + '  x' + item.quantity + '  $' + item.price.toFixed(2) + '  = $' + itemTotal.toFixed(2));
  }

  lines.push('----------------------------------------');
  lines.push('Subtotal:                    $' + processedOrder.subtotal.toFixed(2));

  if (processedOrder.discount) {
    lines.push('Discount (' + processedOrder.discount.code + '):        -$' + processedOrder.discount.amount.toFixed(2));
  }

  // recalculate tax for the invoice (duplicated logic from processOrder)
  let taxableAmount = processedOrder.subtotal;
  if (processedOrder.discount) {
    taxableAmount = processedOrder.subtotal - processedOrder.discount.amount;
  }
  let invoiceTaxRate = 0;
  if (processedOrder.shippingAddress.state === 'CA') {
    invoiceTaxRate = 0.0725;
  } else if (processedOrder.shippingAddress.state === 'NY') {
    invoiceTaxRate = 0.08;
  } else if (processedOrder.shippingAddress.state === 'TX') {
    invoiceTaxRate = 0.0625;
  } else if (processedOrder.shippingAddress.state === 'FL') {
    invoiceTaxRate = 0.06;
  } else if (processedOrder.shippingAddress.state === 'WA') {
    invoiceTaxRate = 0.065;
  } else if (processedOrder.shippingAddress.state === 'OR') {
    invoiceTaxRate = 0;
  } else if (processedOrder.shippingAddress.state === 'MT') {
    invoiceTaxRate = 0;
  } else if (processedOrder.shippingAddress.state === 'NH') {
    invoiceTaxRate = 0;
  } else {
    invoiceTaxRate = 0.05;
  }
  let invoiceTax = Math.round(taxableAmount * invoiceTaxRate * 100) / 100;

  lines.push('Tax (' + (invoiceTaxRate * 100).toFixed(2) + '%):                 $' + invoiceTax.toFixed(2));
  lines.push('Shipping (' + processedOrder.shipping.method + '):       $' + processedOrder.shipping.cost.toFixed(2));
  lines.push('========================================');
  lines.push('TOTAL:                       $' + processedOrder.total.toFixed(2));
  lines.push('========================================');

  return lines.join('\n');
}


function processRefund(order, reason) {
  if (!order) {
    return { success: false, error: 'Order is required' };
  }
  if (!reason) {
    return { success: false, error: 'Refund reason is required' };
  }
  if (order.status !== 'processed' && order.status !== 'shipped' && order.status !== 'delivered') {
    return { success: false, error: 'Order is not eligible for refund' };
  }

  let refundAmount = 0;
  let refundType = 'full';

  if (reason === 'damaged') {
    if (order.status === 'delivered') {
      // full refund for damaged delivered items
      refundAmount = order.total;
      refundType = 'full';
    } else if (order.status === 'shipped') {
      // full refund plus shipping for damaged shipped items
      refundAmount = order.total;
      refundType = 'full';
    } else {
      // shouldn't be damaged if not shipped yet, just cancel
      refundAmount = order.total - order.shipping.cost;
      refundType = 'cancellation';
    }
  } else if (reason === 'wrong_item') {
    if (order.status === 'delivered') {
      refundAmount = order.total;
      refundType = 'full';
    } else if (order.status === 'shipped') {
      refundAmount = order.total;
      refundType = 'full';
    } else {
      refundAmount = order.total - order.shipping.cost;
      refundType = 'cancellation';
    }
  } else if (reason === 'changed_mind') {
    if (order.status === 'delivered') {
      // 15% restocking fee for delivered items
      let restockingFee = order.subtotal * 0.15;
      restockingFee = Math.round(restockingFee * 100) / 100;
      refundAmount = order.total - restockingFee - order.shipping.cost;
      refundType = 'partial';
      if (refundAmount < 0) {
        refundAmount = 0;
      }
    } else if (order.status === 'shipped') {
      // 10% restocking fee for shipped items
      let restockingFee = order.subtotal * 0.10;
      restockingFee = Math.round(restockingFee * 100) / 100;
      refundAmount = order.total - restockingFee - order.shipping.cost;
      refundType = 'partial';
      if (refundAmount < 0) {
        refundAmount = 0;
      }
    } else {
      // full refund minus shipping if not shipped
      refundAmount = order.total - order.shipping.cost;
      refundType = 'cancellation';
    }
  } else if (reason === 'late_delivery') {
    if (order.status === 'delivered') {
      if (order.shipping.method === 'express') {
        // 50% refund for late express delivery
        refundAmount = order.total * 0.5;
        refundType = 'partial';
      } else if (order.shipping.method === 'overnight') {
        // full refund for late overnight delivery
        refundAmount = order.total;
        refundType = 'full';
      } else {
        // 25% refund for late standard delivery
        refundAmount = order.total * 0.25;
        refundType = 'partial';
      }
    } else {
      return { success: false, error: 'Cannot claim late delivery for undelivered order' };
    }
  } else {
    // other reasons - partial refund
    if (order.status === 'delivered') {
      refundAmount = order.total * 0.8;
      refundType = 'partial';
    } else if (order.status === 'shipped') {
      refundAmount = order.total * 0.9;
      refundType = 'partial';
    } else {
      refundAmount = order.total - order.shipping.cost;
      refundType = 'cancellation';
    }
  }

  refundAmount = Math.round(refundAmount * 100) / 100;

  return {
    success: true,
    refund: {
      orderId: order.orderId,
      originalTotal: order.total,
      refundAmount: refundAmount,
      refundType: refundType,
      reason: reason,
      processedAt: new Date().toISOString()
    }
  };
}


function getOrderSummary(orders) {
  if (!orders || orders.length === 0) {
    return {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      totalItemsSold: 0,
      totalTaxCollected: 0,
      totalShippingCollected: 0,
      totalDiscountsGiven: 0,
      ordersByStatus: {},
      topProducts: [],
      revenueByState: {}
    };
  }

  let totalRevenue = 0;
  let totalTax = 0;
  let totalShipping = 0;
  let totalDiscounts = 0;
  let totalItems = 0;
  let statusCounts = {};
  let productCounts = {};
  let productRevenue = {};
  let stateRevenue = {};

  for (let i = 0; i < orders.length; i++) {
    totalRevenue += orders[i].total;

    if (orders[i].tax) {
      totalTax += orders[i].tax.amount;
    }

    if (orders[i].shipping) {
      totalShipping += orders[i].shipping.cost;
    }

    if (orders[i].discount) {
      totalDiscounts += orders[i].discount.amount;
    }

    // count items
    for (let j = 0; j < orders[i].items.length; j++) {
      totalItems += orders[i].items[j].quantity;

      let pid = orders[i].items[j].productId;
      if (productCounts[pid]) {
        productCounts[pid] += orders[i].items[j].quantity;
      } else {
        productCounts[pid] = orders[i].items[j].quantity;
      }
      if (productRevenue[pid]) {
        productRevenue[pid] += orders[i].items[j].price * orders[i].items[j].quantity;
      } else {
        productRevenue[pid] = orders[i].items[j].price * orders[i].items[j].quantity;
      }
    }

    // count by status
    let st = orders[i].status;
    if (statusCounts[st]) {
      statusCounts[st] += 1;
    } else {
      statusCounts[st] = 1;
    }

    // revenue by state
    if (orders[i].shippingAddress) {
      let state = orders[i].shippingAddress.state;
      if (stateRevenue[state]) {
        stateRevenue[state] += orders[i].total;
      } else {
        stateRevenue[state] = orders[i].total;
      }
    }
  }

  // build top products list (sorted by quantity sold)
  let topProducts = [];
  let productIds = Object.keys(productCounts);
  for (let i = 0; i < productIds.length; i++) {
    topProducts.push({
      productId: productIds[i],
      quantitySold: productCounts[productIds[i]],
      revenue: Math.round(productRevenue[productIds[i]] * 100) / 100
    });
  }
  // sort by quantity descending
  for (let i = 0; i < topProducts.length; i++) {
    for (let j = i + 1; j < topProducts.length; j++) {
      if (topProducts[j].quantitySold > topProducts[i].quantitySold) {
        let temp = topProducts[i];
        topProducts[i] = topProducts[j];
        topProducts[j] = temp;
      }
    }
  }

  // round state revenue
  let stateKeys = Object.keys(stateRevenue);
  for (let i = 0; i < stateKeys.length; i++) {
    stateRevenue[stateKeys[i]] = Math.round(stateRevenue[stateKeys[i]] * 100) / 100;
  }

  return {
    totalOrders: orders.length,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    averageOrderValue: Math.round((totalRevenue / orders.length) * 100) / 100,
    totalItemsSold: totalItems,
    totalTaxCollected: Math.round(totalTax * 100) / 100,
    totalShippingCollected: Math.round(totalShipping * 100) / 100,
    totalDiscountsGiven: Math.round(totalDiscounts * 100) / 100,
    ordersByStatus: statusCounts,
    topProducts: topProducts,
    revenueByState: stateRevenue
  };
}


module.exports = {
  processOrder,
  generateInvoice,
  processRefund,
  getOrderSummary
};
