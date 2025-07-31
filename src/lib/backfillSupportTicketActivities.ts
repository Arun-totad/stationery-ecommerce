import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { addOrderActivity } from './orderActivity';

export async function backfillSupportTicketActivities() {
  try {
    console.log('Starting support ticket activity backfill...');
    
    // Get all support tickets that have orderId
    const ticketsQuery = query(
      collection(db, 'supportTickets'),
      where('orderId', '!=', null)
    );
    
    const ticketsSnap = await getDocs(ticketsQuery);
    let processedCount = 0;
    let errorCount = 0;
    
    for (const ticketDoc of ticketsSnap.docs) {
      try {
        const ticketData = ticketDoc.data();
        const orderId = ticketData.orderId;
        
        if (!orderId) continue;
        
        // Check if order exists
        const orderRef = doc(db, 'orders', orderId);
        const orderSnap = await getDoc(orderRef);
        
        if (!orderSnap.exists()) {
          console.log(`Order ${orderId} not found for ticket ${ticketDoc.id}`);
          continue;
        }
        
        const orderData = orderSnap.data();
        
        // Check if order already has activity log
        if (orderData.activityLog && orderData.activityLog.length > 0) {
          // Check if support ticket activity already exists
          const hasSupportActivity = orderData.activityLog.some(
            (activity: any) => activity.action === 'support_ticket_created' && 
            activity.newValue === ticketDoc.id
          );
          
          if (hasSupportActivity) {
            console.log(`Support ticket activity already exists for ticket ${ticketDoc.id} in order ${orderId}`);
            continue;
          }
        }
        
        // Add support ticket creation activity
        await addOrderActivity(
          orderId,
          'support_ticket_created',
          `Support ticket created: ${ticketData.subject}`,
          ticketData.userId,
          'customer',
          undefined,
          ticketDoc.id
        );
        
        processedCount++;
        console.log(`Added support ticket activity for ticket ${ticketDoc.id} in order ${orderId}`);
        
      } catch (error) {
        errorCount++;
        console.error(`Error processing ticket ${ticketDoc.id}:`, error);
      }
    }
    
    console.log(`Backfill completed. Processed: ${processedCount}, Errors: ${errorCount}`);
    return { processedCount, errorCount };
    
  } catch (error) {
    console.error('Error during support ticket activity backfill:', error);
    throw error;
  }
} 