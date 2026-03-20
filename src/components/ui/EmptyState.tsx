"use client";

import { motion } from "framer-motion";

interface EmptyStateProps {
  icon?: React.ElementType;
  animation?: React.ReactNode;
  title: string;
  description?: string;
}

export default function EmptyState({ icon: Icon, animation, title, description }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-12"
    >
      {animation ? (
        <div className="mb-4">{animation}</div>
      ) : Icon ? (
        <Icon size={48} className="text-text-muted mb-4" />
      ) : null}
      <h3 className="text-text-secondary text-base font-medium">{title}</h3>
      {description && (
        <p className="text-text-muted text-sm mt-1 max-w-sm text-center">
          {description}
        </p>
      )}
    </motion.div>
  );
}
