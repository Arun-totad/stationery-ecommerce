# Swift Stationery E-commerce Platform

A modern e-commerce platform connecting stationery shops with schools and customers, built with Next.js and Firebase. This platform features robust user roles, streamlined product and order management, comprehensive support system, and secure payment processing with a focus on intuitive user experiences for all stakeholders.

## 🚀 Features

### Core E-commerce Features
- **Multi-user role system** (Customer, Vendor, Admin, Admin-Manager)
- **Secure authentication** with Firebase, including comprehensive error handling
- **Enhanced Product Management** for vendors with dedicated product creation interface and image uploads
- **Shopping cart** and efficient order management with real-time updates
- **Secure Payment Processing** with Razorpay integration (Card/UPI/Netbanking) and Cash on Delivery
- **Order tracking** with estimated delivery dates and status updates

### Advanced Admin Dashboard
- **Comprehensive user and vendor management** with promote/depromote capabilities
- **Detailed user profiles** with full user information and activity tracking
- **Order monitoring** with payment status, delivery tracking, and support ticket integration
- **Support ticket management** with real-time chat functionality
- **Analytics and reporting** for business insights

### Vendor Dashboard
- **Product catalog management** with bulk operations and analytics
- **Order processing** with status updates and delivery tracking
- **Sales analytics** with revenue tracking and performance metrics
- **Inventory management** with stock tracking and low stock alerts
- **Support ticket integration** for order-related issues

### Customer Features
- **User-friendly shopping experience** with responsive design
- **Order history** with detailed tracking and support ticket creation
- **Profile management** with multiple address support
- **Support ticket system** for order issues and general inquiries
- **Real-time order status** updates and notifications

### Support System
- **Comprehensive support ticket system** with real-time chat
- **Order-linked tickets** for seamless issue resolution
- **Multi-role support** (Customer, Vendor, Admin interactions)
- **Ticket status management** (Open, In-Progress, Resolved, Closed)
- **Ticket reopening** functionality for customers

## 🛠 Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS 4, Headless UI, Heroicons, Formik, Yup, React Hot Toast
- **Backend**: Firebase (Authentication, Firestore, Storage), Firebase Admin SDK
- **Payment Processing**: Razorpay (Card/UPI/Netbanking integration)
- **State Management**: React Context + Custom Hooks
- **Data Visualization**: Recharts (for analytics integration)
- **UI/UX**: Framer Motion, React Icons, Canvas Confetti

## 📁 Project Structure

```
src/
├── app/                 # Next.js app directory (pages for various routes)
│   ├── api/            # API routes (Razorpay integration, order processing)
│   ├── admin/          # Admin dashboard pages
│   ├── vendor/         # Vendor dashboard pages
│   ├── account/        # Customer account pages
│   ├── cart/           # Shopping cart
│   ├── checkout/       # Checkout and payment processing
│   └── support/        # Support ticket system
├── components/         # Reusable UI components
│   ├── auth/          # Authentication components
│   ├── layout/        # Layout components (Header, Footer)
│   └── vendor/        # Vendor-specific components
├── context/           # React context providers (Auth, Cart)
├── lib/              # Utility functions and configurations
├── types/            # TypeScript type definitions
└── scripts/          # Utility scripts (order numbering, data sync)
```

## 🎨 UI/UX & Feature Enhancements

### Payment Integration
- **Razorpay Integration**: Secure online payments with Card/UPI/Netbanking support
- **Cash on Delivery**: Traditional payment method for customer preference
- **Payment verification**: Server-side signature verification for security
- **Order confirmation**: Automatic order creation after successful payment

### Support Ticket System
- **Real-time chat**: Live messaging between customers, vendors, and admins
- **Order linking**: Direct connection between orders and support tickets
- **Status management**: Comprehensive ticket lifecycle management
- **Role-based access**: Different interfaces for customers, vendors, and admins
- **Ticket numbering**: Custom ticket IDs with date-based numbering system

### Order Management
- **Persistent order numbers**: Sequential order numbering system
- **Delivery tracking**: Estimated delivery dates and status updates
- **Fee calculation**: Automatic delivery and service fee calculation
- **Multi-vendor orders**: Separate orders per vendor for efficient processing
- **Stock management**: Automatic stock deduction on order placement

### Enhanced User Experience
- **Responsive design**: Mobile-first approach with Tailwind CSS
- **Real-time updates**: Live data synchronization across all components
- **Error handling**: Comprehensive error messages and user feedback
- **Loading states**: Smooth loading animations and transitions
- **Toast notifications**: User-friendly success and error notifications

### Admin & Vendor Features
- **Bulk operations**: Efficient product and order management
- **Analytics dashboard**: Sales and performance metrics
- **User management**: Comprehensive user profile and role management
- **Support integration**: Direct access to support tickets from orders

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd stationery-ecommerce
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Set up Firebase**
   - Create a Firebase project
   - Enable Authentication, Firestore, and Storage
   - Configure Firestore security rules
   - Set up Firebase Admin SDK service account

4. **Set up Razorpay**
   - Create a Razorpay account
   - Get your API keys (Key ID and Key Secret)
   - Configure webhook endpoints

5. **Environment Variables**
   Create a `.env.local` file with the following variables:
   ```env
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
   NEXT_PUBLIC_FIREBASE_APP_ID=
   
   # Razorpay Configuration
   RAZORPAY_KEY_ID=
   RAZORPAY_KEY_SECRET=
   NEXT_PUBLIC_RAZORPAY_KEY_ID=
   
   # Firebase Admin SDK (for scripts)
   FIREBASE_ADMIN_PROJECT_ID=
   ```

6. **Run the development server**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

## 📋 Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run sync-vendor-products` - Sync vendor products data
- `npm run backfill-order-numbers` - Backfill missing order numbers

## 👥 User Roles

### Customer
- Browse and purchase products
- Manage shopping cart and checkout
- View order history and tracking
- Create and manage support tickets
- Manage profile and addresses

### Vendor
- Manage product catalog with images
- Process and track orders
- View sales analytics and revenue
- Handle support tickets for their products
- Manage inventory and stock levels

### Admin
- Monitor all customers and vendors
- Manage user roles and permissions
- Access comprehensive support system
- View transaction analytics
- Manage platform-wide settings

### Admin-Manager
- All Admin privileges
- Manage admin roles and access
- Add/remove admin permissions
- Platform configuration management

## 🔧 Configuration

### Firebase Setup
1. Create a new Firebase project
2. Enable Authentication with Email/Password
3. Create Firestore database with appropriate security rules
4. Enable Storage for product images
5. Download service account key for admin scripts

### Razorpay Setup
1. Sign up for Razorpay account
2. Get API keys from dashboard
3. Configure webhook endpoints for payment verification
4. Test payment integration in sandbox mode

### Security Rules
Configure Firestore security rules to ensure proper access control:
- Users can only access their own data
- Vendors can manage their products and orders
- Admins have full access to all data
- Support tickets follow role-based access

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Configure environment variables
3. Deploy automatically on push to main branch

### Other Platforms
- Configure environment variables
- Set up Firebase hosting (optional)
- Configure custom domain and SSL

## 📈 Performance & Optimization

- **Next.js 15** with App Router for optimal performance
- **Turbopack** for faster development builds
- **Image optimization** with Next.js Image component
- **Code splitting** and lazy loading
- **Firebase caching** for improved data access
- **Responsive design** for all device sizes

## 🔒 Security Features

- **Firebase Authentication** with secure user management
- **Firestore security rules** for data protection
- **Razorpay signature verification** for payment security
- **Input validation** with Formik and Yup
- **XSS protection** with proper data sanitization
- **Role-based access control** throughout the application

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation for common issues

---

**Built with ❤️ using Next.js, Firebase, and Razorpay**
# Swift
