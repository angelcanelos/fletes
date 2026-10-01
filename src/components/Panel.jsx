import { Card, CardHeader, CardBody } from '@heroui/react';

export default function Panel({ titulo, icon: Icon, children }) {
  return (
    <Card className="mb-4 border border-surface-border shadow-card" shadow="none">
      <CardHeader className="gap-2.5 pb-0">
        {Icon && (
          <span className="flex h-7 w-7 flex-none items-center justify-center rounded-md bg-brand-50 text-brand-600">
            <Icon className="h-4 w-4" strokeWidth={2.25} />
          </span>
        )}
        <h2 className="m-0 text-[13px] font-bold uppercase tracking-wide text-ink-700">{titulo}</h2>
      </CardHeader>
      <CardBody className="pt-3">{children}</CardBody>
    </Card>
  );
}
