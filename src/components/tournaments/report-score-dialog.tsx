"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2 } from "lucide-react";

const reportScoreSchema = z.object({
  topScore: z.coerce.number().min(0, "Score must be non-negative."),
  bottomScore: z.coerce.number().min(0, "Score must be non-negative."),
}).refine(data => data.topScore !== data.bottomScore, {
  message: "Scores cannot be the same (no ties allowed).",
  path: ["topScore"],
});

type ReportScoreDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  match: {
    id: number;
    top: { name: string };
    bottom: { name: string };
  };
  onScoreReported: () => void;
};

export function ReportScoreDialog({ isOpen, onOpenChange, match, onScoreReported }: ReportScoreDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof reportScoreSchema>>({
    resolver: zodResolver(reportScoreSchema),
    defaultValues: {
      topScore: 0,
      bottomScore: 0,
    },
  });

  async function onSubmit(values: z.infer<typeof reportScoreSchema>) {
    setLoading(true);
    // Here you would call an API to save the score
    console.log({ matchId: match.id, scores: values });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // This is where we would update the state.
    // For now, we will just call the callback
    onScoreReported();
    
    setLoading(false);
    onOpenChange(false);
    toast({
        title: "Score Reported",
        description: `The score for ${match.top.name} vs ${match.bottom.name} has been submitted.`,
    });
    form.reset();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!loading) {
        onOpenChange(open);
        if (!open) form.reset();
      }
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Report Match Score</DialogTitle>
          <DialogDescription>
            Enter the final score for the match between {match.top.name} and {match.bottom.name}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
                 <FormField
                  control={form.control}
                  name="topScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{match.top.name}</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="bottomScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{match.bottom.name}</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
             <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Score
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}