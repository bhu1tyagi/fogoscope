interface PageWrapperProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function PageWrapper({ title, description, children }: PageWrapperProps) {
  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
        {description && (
          <p className="mt-1 text-text-secondary">{description}</p>
        )}
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}
