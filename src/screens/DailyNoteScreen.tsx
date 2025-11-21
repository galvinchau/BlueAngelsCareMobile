// src/screens/DailyNoteScreen.tsx
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  View,
  TouchableOpacity,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

/** ==== Navigation types ==== */
import type { RootStackParamList } from "../../App";
import type { MobileDailyNotePayload } from "../types/mobileApi";
import { submitDailyNote } from "../api/mobileClient";

type Props = NativeStackScreenProps<RootStackParamList, "DailyNote">;

/** ==== Reusable small components for consistent style ==== */

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View style={{ marginBottom: 16 }}>
    <Text
      style={{
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 8,
        color: "#111827",
      }}
    >
      {title}
    </Text>
    {children}
  </View>
);

const Label = ({ children }: { children: React.ReactNode }) => (
  <Text
    style={{
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 4,
      color: "#374151",
    }}
  >
    {children}
  </Text>
);

const Input = (props: React.ComponentProps<typeof TextInput>) => (
  <TextInput
    {...props}
    placeholderTextColor="#9CA3AF"
    style={[
      {
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 14,
        color: "#111827",
        backgroundColor: "#FFFFFF",
      },
      props.style,
    ]}
  />
);

const TextArea = (props: React.ComponentProps<typeof TextInput>) => (
  <TextInput
    {...props}
    multiline
    textAlignVertical="top"
    placeholderTextColor="#9CA3AF"
    style={[
      {
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 14,
        color: "#111827",
        backgroundColor: "#FFFFFF",
        minHeight: 80,
      },
      props.style,
    ]}
  />
);

const PrimaryButton = ({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    style={{
      backgroundColor: disabled ? "#9CA3AF" : "#0284C7",
      paddingVertical: 12,
      borderRadius: 999,
      alignItems: "center",
      marginTop: 8,
    }}
  >
    <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>
      {title}
    </Text>
  </TouchableOpacity>
);

/** ==== Daily Note Screen ==== */

export const DailyNoteScreen: React.FC<Props> = ({ route, navigation }) => {
  const {
    shiftId,
    date,
    individualId,
    individualName,
    individualDob,
    individualMa,
    individualAddress,
    serviceCode,
    serviceName,
    scheduleStart,
    scheduleEnd,
    outcomeText,
  } = route.params;

  // Visit times (DSP nhập)
  const [visitStart, setVisitStart] = useState("");
  const [visitEnd, setVisitEnd] = useState("");

  // Main content
  const [todayPlan, setTodayPlan] = useState("");
  const [whatWeWorkedOn, setWhatWeWorkedOn] = useState("");
  const [opportunities, setOpportunities] = useState("");
  const [notes, setNotes] = useState("");

  // Meals
  const [breakfastTime, setBreakfastTime] = useState("");
  const [breakfastHad, setBreakfastHad] = useState("");
  const [breakfastOffered, setBreakfastOffered] = useState("");

  const [lunchTime, setLunchTime] = useState("");
  const [lunchHad, setLunchHad] = useState("");
  const [lunchOffered, setLunchOffered] = useState("");

  const [dinnerTime, setDinnerTime] = useState("");
  const [dinnerHad, setDinnerHad] = useState("");
  const [dinnerOffered, setDinnerOffered] = useState("");

  // Health / Incident
  const [healthNotes, setHealthNotes] = useState("");
  const [incidentNotes, setIncidentNotes] = useState("");

  // Signature (simple version)
  const [staffName, setStaffName] = useState("");
  const [certifyText, setCertifyText] = useState(
    "I certify that the above services were delivered as documented."
  );

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    // TODO sau này: lấy staffId thật từ context/login
    const staffId = "STAFF_DEMO";

    const payload: MobileDailyNotePayload = {
      shiftId,
      staffId,
      individualId,

      date,
      individualName,
      individualDob,
      individualMa,
      individualAddress,

      serviceCode,
      serviceName,
      scheduleStart,
      scheduleEnd,
      outcomeText,

      visitStart,
      visitEnd,

      todayPlan,
      whatWeWorkedOn,
      opportunities,
      notes,

      meals: {
        breakfast: {
          time: breakfastTime || undefined,
          had: breakfastHad || undefined,
          offered: breakfastOffered || undefined,
        },
        lunch: {
          time: lunchTime || undefined,
          had: lunchHad || undefined,
          offered: lunchOffered || undefined,
        },
        dinner: {
          time: dinnerTime || undefined,
          had: dinnerHad || undefined,
          offered: dinnerOffered || undefined,
        },
      },

      healthNotes: healthNotes || undefined,
      incidentNotes: incidentNotes || undefined,

      staffName,
      certifyText,
    };

    try {
      setIsSubmitting(true);

      // Gọi API thật
      const result = await submitDailyNote(payload);

      console.log("DailyNote submit result:", result);

      Alert.alert(
        "Daily Note",
        "Daily Note has been submitted to backend.",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
          {
            text: "Show JSON",
            onPress: () => console.log("DailyNote payload:", payload),
            style: "default",
          },
        ]
      );
    } catch (err: any) {
      console.error("DailyNote submit error:", err);
      Alert.alert(
        "Error",
        "Failed to submit Daily Note. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F3F4F6" }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingVertical: 16,
          paddingBottom: 32,
        }}
      >
        {/* Header */}
        <Text
          style={{
            fontSize: 20,
            fontWeight: "800",
            marginBottom: 12,
            color: "#111827",
            textAlign: "center",
          }}
        >
          Daily Note
        </Text>

        {/* Individual info */}
        <Section title="Individual information">
          <Label>Individual</Label>
          <Input value={individualName} editable={false} />

          <View style={{ height: 8 }} />

          <Label>Date of Birth</Label>
          <Input value={individualDob || ""} editable={false} />

          <View style={{ height: 8 }} />

          <Label>MA#</Label>
          <Input value={individualMa || ""} editable={false} />

          <View style={{ height: 8 }} />

          <Label>Address</Label>
          <Input value={individualAddress || ""} editable={false} />

          <View style={{ height: 8 }} />

          <Label>Date of service</Label>
          <Input value={date} editable={false} />
        </Section>

        {/* Service + Schedule */}
        <Section title="Service & Schedule">
          <Label>Service</Label>
          <Input value={serviceName} editable={false} />

          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <View style={{ flex: 1 }}>
              <Label>Schedule Start</Label>
              <Input value={scheduleStart} editable={false} />
            </View>
            <View style={{ flex: 1 }}>
              <Label>Schedule End</Label>
              <Input value={scheduleEnd} editable={false} />
            </View>
          </View>

          <View style={{ height: 8 }} />

          <Label>ISP Outcome / Goal</Label>
          <TextArea value={outcomeText || ""} editable={false} />
        </Section>

        {/* Visit actual times */}
        <Section title="Visit actual time">
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Label>Visit Start (HH:MM)</Label>
              <Input
                placeholder="e.g. 07:05"
                value={visitStart}
                onChangeText={setVisitStart}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Label>Visit End (HH:MM)</Label>
              <Input
                placeholder="e.g. 14:58"
                value={visitEnd}
                onChangeText={setVisitEnd}
              />
            </View>
          </View>
        </Section>

        {/* Main content */}
        <Section title="Service activities">
          <Label>Today&apos;s plan</Label>
          <TextArea
            placeholder="Planned goals, objectives, or tasks for this visit..."
            value={todayPlan}
            onChangeText={setTodayPlan}
          />

          <View style={{ height: 8 }} />

          <Label>What we worked on today</Label>
          <TextArea
            placeholder="Describe support provided, skills practiced, community activities..."
            value={whatWeWorkedOn}
            onChangeText={setWhatWeWorkedOn}
          />

          <View style={{ height: 8 }} />

          <Label>Opportunities / Progress</Label>
          <TextArea
            placeholder="Progress toward outcomes, strengths, challenges, next steps..."
            value={opportunities}
            onChangeText={setOpportunities}
          />

          <View style={{ height: 8 }} />

          <Label>Additional notes</Label>
          <TextArea
            placeholder="Any additional notes, family communication, safety reminders..."
            value={notes}
            onChangeText={setNotes}
          />
        </Section>

        {/* Meals */}
        <Section title="Meals">
          <Label>Breakfast</Label>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
            <View style={{ flex: 1 }}>
              <Input
                placeholder="Time (HH:MM)"
                value={breakfastTime}
                onChangeText={setBreakfastTime}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                placeholder="Had (Y/N / amount)"
                value={breakfastHad}
                onChangeText={setBreakfastHad}
              />
            </View>
          </View>
          <Input
            placeholder="Offered (description)"
            value={breakfastOffered}
            onChangeText={setBreakfastOffered}
          />

          <View style={{ height: 10 }} />

          <Label>Lunch</Label>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
            <View style={{ flex: 1 }}>
              <Input
                placeholder="Time (HH:MM)"
                value={lunchTime}
                onChangeText={setLunchTime}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                placeholder="Had (Y/N / amount)"
                value={lunchHad}
                onChangeText={setLunchHad}
              />
            </View>
          </View>
          <Input
            placeholder="Offered (description)"
            value={lunchOffered}
            onChangeText={setLunchOffered}
          />

          <View style={{ height: 10 }} />

          <Label>Dinner</Label>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
            <View style={{ flex: 1 }}>
              <Input
                placeholder="Time (HH:MM)"
                value={dinnerTime}
                onChangeText={setDinnerTime}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                placeholder="Had (Y/N / amount)"
                value={dinnerHad}
                onChangeText={setDinnerHad}
              />
            </View>
          </View>
          <Input
            placeholder="Offered (description)"
            value={dinnerOffered}
            onChangeText={setDinnerOffered}
          />
        </Section>

        {/* Health & incidents */}
        <Section title="Health & behavior">
          <Label>Health / observations</Label>
          <TextArea
            placeholder="Any changes in health, mood, sleep, hygiene, etc."
            value={healthNotes}
            onChangeText={setHealthNotes}
          />

          <View style={{ height: 8 }} />

          <Label>Incidents / medication issues</Label>
          <TextArea
            placeholder="Any incident, injury, behavior, or medication concerns."
            value={incidentNotes}
            onChangeText={setIncidentNotes}
          />
        </Section>

        {/* Signature */}
        <Section title="DSP certification">
          <Label>Staff name</Label>
          <Input
            placeholder="Your full name"
            value={staffName}
            onChangeText={setStaffName}
          />

          <View style={{ height: 8 }} />

          <Label>Certification text</Label>
          <TextArea value={certifyText} onChangeText={setCertifyText} />
        </Section>

        <PrimaryButton
          title={isSubmitting ? "Submitting..." : "Submit Daily Note"}
          onPress={handleSubmit}
          disabled={isSubmitting}
        />
      </ScrollView>
    </View>
  );
};
