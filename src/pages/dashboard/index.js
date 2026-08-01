import React from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import PageTitle from '@/components/PageTitle';

const DashboardOverview = () => {
  return (
    <DashboardLayout title="Overview">
      <PageTitle title="Dashboard Overview" subtitle="Welcome to your AI Chatbot Dashboard." />
      <div>
        <p className="text-gray-600">
          This is the overview page where you can see the high-level metrics and status of your Facebook AI Chatbot.
        </p>
      </div>
    </DashboardLayout>
  );
};

export default DashboardOverview;
