import { Separator } from "@/components/ui/separator";

interface MetadataItem {
  id: number;
  key: string;
  value: string;
}

interface MetadataListProps {
  items: MetadataItem[];
}

export function InfoPanel({ items }: MetadataListProps) {
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={item.id}>
          <div className="flex justify-between py-1">
            <span className="font-medium text-muted-foreground">
              {item.key}
            </span>
            <span className="text-right">{item.value}</span>
          </div>
          {index < items.length - 1 && <Separator />}
        </div>
      ))}
    </div>
  );
}
