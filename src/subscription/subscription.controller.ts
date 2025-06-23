import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionService } from './subscription.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Subscription')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('plan')
  @ApiOperation({ summary: 'Get subscription plan details' })
  @ApiResponse({
    status: 200,
    description: 'Plan details retrieved successfully',
  })
  async getSubscriptionPlan() {
    return this.subscriptionService.getSubscriptionPlan();
  }

  @Get('status')
  @ApiOperation({ summary: 'Get user subscription status' })
  @ApiResponse({
    status: 200,
    description: 'Subscription status retrieved successfully',
  })
  async getUserSubscription(@Request() req) {
    return this.subscriptionService.getUserSubscription(req.user.userId);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Create checkout session for subscription' })
  @ApiBody({
    schema: {
      type: 'object',
      // properties: {
      //   successUrl: 'http://localhost:3001/checkout/succes',
      //   cancelUrl: 'http://localhost:3001/checkout/cancelUrl',
      // },
      required: ['successUrl', 'cancelUrl'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Checkout session created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'User already has active subscription',
  })
  async createCheckoutSession(
    @Request() req,
    @Body() body: { successUrl: string; cancelUrl: string },
  ) {
    console.log('User in request:', req.user);
    return this.subscriptionService.createCheckoutSession(
      req.user.userId,
      body.successUrl,
      body.cancelUrl,
    );
  }

  @Delete('cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel user subscription' })
  @ApiResponse({
    status: 200,
    description: 'Subscription cancelled successfully',
  })
  @ApiResponse({ status: 404, description: 'No subscription found' })
  @ApiResponse({ status: 400, description: 'Subscription is not active' })
  async cancelSubscription(@Request() req) {
    return this.subscriptionService.cancelSubscription(req.user.userId);
  }

  @Post('reactivate')
  @ApiOperation({ summary: 'Reactivate user subscription' })
  @ApiResponse({
    status: 200,
    description: 'Subscription reactivated successfully',
  })
  @ApiResponse({ status: 404, description: 'No subscription found' })
  @ApiResponse({ status: 400, description: 'Subscription is already active' })
  async reactivateSubscription(@Request() req) {
    return this.subscriptionService.reactivateSubscription(req.user.userId);
  }

  @Post('webhook')
  @Public()
  @ApiOperation({ summary: 'Handle Stripe webhooks' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleWebhook(@Req() req) {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      event = this.subscriptionService['stripe'].webhooks.constructEvent(
        req.body,
        sig,
        endpointSecret,
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return { error: 'Webhook signature verification failed' };
    }

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
        await this.subscriptionService.handleSubscriptionCreated(
          event.data.object,
        );
        break;
      case 'customer.subscription.updated':
        await this.subscriptionService.handleSubscriptionUpdated(
          event.data.object,
        );
        break;
      case 'customer.subscription.deleted':
        await this.subscriptionService.handleSubscriptionCancelled(
          event.data.object,
        );
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    return { received: true };
  }
}
