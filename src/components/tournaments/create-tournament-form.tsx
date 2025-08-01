"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

const stepOneSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters.").max(100),
  description: z.string().max(500).optional(),
  game: z.string().min(1, "Game/Sport is required."),
});

const stepTwoSchema = z.object({
  format: z.enum(["single-elimination", "double-elimination", "swiss"]),
  startDate: z.date({ required_error: "A start date is required." }),
  maxParticipants: z.coerce.number().min(2, "At least 2 participants are required.").max(256),
  registrationType: z.enum(["public", "private"]),
});

const formSchema = stepOneSchema.merge(stepTwoSchema);

export function CreateTournamentForm() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(step === 1 ? stepOneSchema : formSchema),
    defaultValues: {
      name: "",
      description: "",
      game: "",
      format: "single-elimination",
      registrationType: "public",
      maxParticipants: 16,
    },
  });

  const handleNext = async () => {
    const isValid = await form.trigger(["name", "game"]);
    if (isValid) {
      setStep(2);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    console.log("Creating tournament:", values);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLoading(false);
    toast({
        title: "Tournament Created!",
        description: `Your tournament "${values.name}" is now live.`,
    });
    router.push(`/tournaments/1`); // Redirect to a mock tournament page
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="relative overflow-hidden">
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in-0 zoom-in-95">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tournament Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Summer Showdown 2024" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="A brief description of your tournament." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="game"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Game / Sport</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Street Fighter 6, Chess" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-in fade-in-0 zoom-in-95">
                <FormField
                  control={form.control}
                  name="format"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Tournament Format</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                           <SelectTrigger>
                             <SelectValue placeholder="Select a format" />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="single-elimination">Single Elimination</SelectItem>
                             <SelectItem value="double-elimination">Double Elimination</SelectItem>
                             <SelectItem value="swiss">Swiss</SelectItem>
                           </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0,0,0,0))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="maxParticipants"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Participants</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="registrationType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Registration Type</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex space-x-4"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="public" />
                            </FormControl>
                            <FormLabel className="font-normal">Public</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="private" />
                            </FormControl>
                            <FormLabel className="font-normal">Private</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
        </div>

        <div className="flex justify-between pt-4">
          {step === 1 ? (
             <Button type="button" variant="ghost" onClick={() => router.back()}>
                Cancel
             </Button>
          ) : (
             <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Back
             </Button>
          )}

          {step === 1 ? (
            <Button type="button" onClick={handleNext}>
              Next
            </Button>
          ) : (
            <Button type="submit" disabled={loading}>
               {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Tournament
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
