import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-gray-50 text-center py-4 text-sm text-gray-500">
      &copy; {new Date().getFullYear()} AI Chatbot Builder. All rights reserved.
    </footer>
  );
};

export default Footer;
