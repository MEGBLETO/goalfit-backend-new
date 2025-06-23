import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SubscriptionService {
  getSubscriptionPlan() {
    try {
      return {
        name: 'Pro Plan',
        price: 9.99,
        currency: 'USD',
        interval: 'month',
        features: [
          'Personalized meal plans',
          'Custom workout plans',
          'Weight tracking',
          'Progress analytics',
          'Priority support',
        ],
      };
    } catch (error) {
      console.error('[SubscriptionService:getSubscriptionPlan] Error:', error);
      throw new InternalServerErrorException(
        'Could not retrieve subscription plan details.',
      );
    }
  }
  private stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY'),
      {
        apiVersion: '2025-05-28.basil',
      },
    );
  }

  // Create a checkout session for subscription
  async createCheckoutSession(
    userId: string,
    successUrl: string,
    cancelUrl: string,
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if user already has an active subscription
      const existingSubscription = await this.prisma.subscription.findUnique({
        where: { userId },
      });

      if (existingSubscription && existingSubscription.status === 'ACTIVE') {
        throw new BadRequestException(
          'User already has an active subscription',
        );
      }

      const successUrl = this.configService.get<string>('STRIPE_SUCCESS_URL');
      const cancelUrl = this.configService.get<string>('STRIPE_CANCEL_URL');
      const priceId = this.configService.get<string>('STRIPE_PRICE_ID');

      const session = await this.stripe.checkout.sessions.create({
        customer_email: user.email,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        subscription_data: {
          metadata: {
            userId: userId,
          },
        },
        metadata: {
          userId: userId,
        },
      });

      return {
        sessionId: session.id,
        url: session.url,
      };
    } catch (error) {
      console.error(
        `[SubscriptionService:createCheckoutSession] Error for user ${userId}:`,
        error,
      );
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error creating checkout session.',
      );
    }
  }

  // Handle successful subscription (webhook)
  async handleSubscriptionCreated(subscription: Stripe.Subscription) {
    try {
      const userId = (subscription as any).metadata.userId;

      if (!userId) {
        throw new BadRequestException('No userId in subscription metadata');
      }

      // Create or update subscription in database
      const dbSubscription = await this.prisma.subscription.upsert({
        where: { userId },
        update: {
          provider: 'stripe',
          providerSubId: (subscription as any).id,
          status:
            (subscription as any).status === 'active' ? 'ACTIVE' : 'INACTIVE',
          startDate: new Date(
            (subscription as any).current_period_start * 1000,
          ),
          endDate: new Date((subscription as any).current_period_end * 1000),
          updatedAt: new Date(),
        },
        create: {
          userId,
          provider: 'stripe',
          providerSubId: (subscription as any).id,
          status:
            (subscription as any).status === 'active' ? 'ACTIVE' : 'INACTIVE',
          startDate: new Date(
            (subscription as any).current_period_start * 1000,
          ),
          endDate: new Date((subscription as any).current_period_end * 1000),
        },
      });

      // Create payment record
      if ((subscription as any).latest_invoice) {
        const invoice = await this.stripe.invoices.retrieve(
          (subscription as any).latest_invoice as string,
        );
        if ((invoice as any).payment_intent) {
          await this.handleSuccessfulPayment(dbSubscription, invoice as any);
        }
      }

      console.log(`Subscription created for user ${userId}`);
    } catch (error) {
      console.error(
        '[SubscriptionService:handleSubscriptionCreated] Webhook Error:',
        error,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error handling subscription creation webhook.',
      );
    }
  }

  // Handle subscription updates (webhook)
  async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    try {
      const userId = (subscription as any).metadata.userId;

      if (!userId) {
        throw new BadRequestException('No userId in subscription metadata');
      }

      const dbSubscription = await this.prisma.subscription.findUnique({
        where: { userId },
      });

      if (!dbSubscription) {
        throw new Error('Subscription not found in db for user ' + userId);
      }

      // Update subscription in database
      await this.prisma.subscription.update({
        where: { userId },
        data: {
          status:
            (subscription as any).status === 'active' ? 'ACTIVE' : 'INACTIVE',
          startDate: new Date(
            (subscription as any).current_period_start * 1000,
          ),
          endDate: new Date((subscription as any).current_period_end * 1000),
          updatedAt: new Date(),
        },
      });

      const invoice = await this.stripe.invoices.retrieve(
        (subscription as any).latest_invoice as string,
      );

      if ((invoice as any).payment_intent) {
        await this.handleSuccessfulPayment(dbSubscription, invoice as any);
      }

      console.log(`Subscription updated for user ${userId}`);
    } catch (error) {
      console.error(
        '[SubscriptionService:handleSubscriptionUpdated] Webhook Error:',
        error,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error handling subscription update webhook.',
      );
    }
  }

  // Handle subscription cancellation (webhook)
  async handleSubscriptionCancelled(subscription: Stripe.Subscription) {
    try {
      const userId = (subscription as any).metadata.userId;

      if (!userId) {
        throw new BadRequestException('No userId in subscription metadata');
      }

      // Update subscription status
      await this.prisma.subscription.update({
        where: { userId },
        data: {
          status: 'CANCELLED',
          endDate: new Date((subscription as any).canceled_at * 1000),
          updatedAt: new Date(),
        },
      });

      console.log(`Subscription cancelled for user ${userId}`);
    } catch (error) {
      console.error(
        '[SubscriptionService:handleSubscriptionCancelled] Webhook Error:',
        error,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error handling subscription cancellation webhook.',
      );
    }
  }

  // Get user's subscription status
  async getUserSubscription(userId: string) {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { userId },
        include: {
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      });

      if (!subscription) {
        return {
          hasSubscription: false,
          status: null,
          plan: null,
        };
      }

      return {
        hasSubscription: true,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        plan: this.getSubscriptionPlan(),
        recentPayments: subscription.payments,
      };
    } catch (error) {
      console.error(
        `[SubscriptionService:getUserSubscription] Error for user ${userId}:`,
        error,
      );
      throw new InternalServerErrorException(
        'Error getting user subscription.',
      );
    }
  }

  // Cancel subscription
  async cancelSubscription(userId: string) {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { userId },
      });

      if (!subscription) {
        throw new NotFoundException('No subscription found for user');
      }

      if (subscription.status !== 'ACTIVE') {
        throw new BadRequestException('Subscription is not active');
      }

      // Cancel subscription in Stripe
      await this.stripe.subscriptions.update(subscription.providerSubId, {
        cancel_at_period_end: true,
      });

      // Update local subscription
      await this.prisma.subscription.update({
        where: { userId },
        data: {
          status: 'CANCELLED',
          updatedAt: new Date(),
        },
      });

      return { message: 'Subscription cancelled successfully' };
    } catch (error) {
      console.error(
        `[SubscriptionService:cancelSubscription] Error for user ${userId}:`,
        error,
      );
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error cancelling subscription.');
    }
  }

  // Reactivate subscription
  async reactivateSubscription(userId: string) {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { userId },
      });

      if (!subscription) {
        throw new NotFoundException('No subscription found for user');
      }

      if (subscription.status === 'ACTIVE') {
        throw new BadRequestException('Subscription is already active');
      }

      // Reactivate subscription in Stripe
      await this.stripe.subscriptions.update(subscription.providerSubId, {
        cancel_at_period_end: false,
      });

      // Update local subscription
      await this.prisma.subscription.update({
        where: { userId },
        data: {
          status: 'ACTIVE',
          updatedAt: new Date(),
        },
      });

      return { message: 'Subscription reactivated successfully' };
    } catch (error) {
      console.error(
        `[SubscriptionService:reactivateSubscription] Error for user ${userId}:`,
        error,
      );
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error reactivating subscription.',
      );
    }
  }

  // Check if user has active subscription
  async hasActiveSubscription(userId: string): Promise<boolean> {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { userId },
      });

      return subscription?.status === 'ACTIVE';
    } catch (error) {
      console.error(
        `[SubscriptionService:hasActiveSubscription] Error for user ${userId}:`,
        error,
      );
      // To be safe, return false if an error occurs
      return false;
    }
  }

  private async handleSuccessfulPayment(
    dbSubscription: any,
    invoice: Stripe.Invoice,
  ) {
    const userId = dbSubscription.userId;
    if (!userId) {
      console.error('User ID not found in subscription metadata');
      return;
    }
    const paymentIntentId =
      typeof (invoice as any).payment_intent === 'string'
        ? (invoice as any).payment_intent
        : (invoice as any).payment_intent.id;

    if (paymentIntentId) {
      await this.prisma.payment.create({
        data: {
          subscriptionId: dbSubscription.id,
          userId,
          amount: (invoice as any).amount_paid / 100,
          providerIntentId: paymentIntentId,
          method: 'stripe',
          status: 'succeeded',
          invoiceUrl: (invoice as any).hosted_invoice_url,
        },
      });
    }
  }
}
