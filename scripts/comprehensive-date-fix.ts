import "dotenv/config";
import prisma from "../libs/prismadb";

async function fixAllMemberDates() {
  console.log("🚀 COMPREHENSIVE DATE FIX FOR ALL MEMBERS STARTED\n");

  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5h 30m

  try {
    // 1. Fix ALL Member.joiningDate (ALL member types)
    console.log("📅 1. Fixing Member.joiningDate...");
    const allMembers = await prisma.member.findMany({
      select: {
        id: true,
        joiningDate: true,
        memberId: true,
        memberType: true,
      },
    });

    let memberFixedCount = 0;
    for (const member of allMembers) {
      if (!member.joiningDate) continue;

      const date = new Date(member.joiningDate);
      const utcHour = date.getUTCHours();
      const utcMinute = date.getUTCMinutes();

      // Detect IST offset pattern: 18:30 or 13:00 UTC
      if ((utcHour === 18 && utcMinute === 30) || utcHour === 13) {
        const correctedDate = new Date(date.getTime() + IST_OFFSET_MS);

        await prisma.member.update({
          where: { id: member.id },
          data: { joiningDate: correctedDate },
        });

        console.log(
          `  ✅ ${member.memberType} ${member.memberId}: ${date
            .toISOString()
            .slice(0, 10)} → ${correctedDate.toISOString().slice(0, 10)}`
        );
        memberFixedCount++;
      }
    }
    console.log(`✅ Members fixed: ${memberFixedCount}\n`);

    // 2. Fix ALL MemberFee.paidOn
    console.log("💰 2. Fixing MemberFee.paidOn...");
    const allFees = await prisma.memberFee.findMany({
      select: {
        id: true,
        paidOn: true,
        fiscalLabel: true,
        member: { select: { memberId: true, memberType: true } },
      },
    });

    let feeFixedCount = 0;
    for (const fee of allFees) {
      if (!fee.paidOn) continue;

      const date = new Date(fee.paidOn);
      const utcHour = date.getUTCHours();
      const utcMinute = date.getUTCMinutes();

      if ((utcHour === 18 && utcMinute === 30) || utcHour === 13) {
        const correctedDate = new Date(date.getTime() + IST_OFFSET_MS);

        await prisma.memberFee.update({
          where: { id: fee.id },
          data: { paidOn: correctedDate },
        });

        console.log(
          `  💰 ${fee.member.memberType} ${fee.member.memberId} (${
            fee.fiscalLabel
          }): ${date.toISOString().slice(0, 10)} → ${correctedDate
            .toISOString()
            .slice(0, 10)}`
        );
        feeFixedCount++;
      }
    }
    console.log(`✅ Fees fixed: ${feeFixedCount}\n`);

    // 3. Fix ALL MemberTypeHistory
    console.log("📜 3. Fixing MemberTypeHistory...");
    const allHistory = await prisma.memberTypeHistory.findMany({
      select: {
        id: true,
        startDate: true,
        endDate: true,
        member: { select: { memberId: true, memberType: true } },
      },
    });

    let historyFixedCount = 0;
    for (const record of allHistory) {
      const updates: any = {};

      // Fix startDate
      if (record.startDate) {
        const date = new Date(record.startDate);
        const utcHour = date.getUTCHours();
        const utcMinute = date.getUTCMinutes();

        if ((utcHour === 18 && utcMinute === 30) || utcHour === 13) {
          updates.startDate = new Date(date.getTime() + IST_OFFSET_MS);
        }
      }

      // Fix endDate
      if (record.endDate) {
        const date = new Date(record.endDate);
        const utcHour = date.getUTCHours();
        const utcMinute = date.getUTCMinutes();

        if ((utcHour === 18 && utcMinute === 30) || utcHour === 13) {
          updates.endDate = new Date(date.getTime() + IST_OFFSET_MS);
        }
      }

      if (Object.keys(updates).length > 0) {
        await prisma.memberTypeHistory.update({
          where: { id: record.id },
          data: updates,
        });

        console.log(
          `  📜 ${record.member?.memberType || "UNKNOWN"} ${
            record.member?.memberId || "UNKNOWN"
          }: Fixed`
        );
        historyFixedCount++;
      }
    }
    console.log(`✅ History fixed: ${historyFixedCount}\n`);

    console.log("🎉 === ALL DATES CORRECTED SUCCESSFULLY ===");
    console.log(
      `📊 TOTAL FIXES: Members(${memberFixedCount}) | Fees(${feeFixedCount}) | History(${historyFixedCount})`
    );
  } catch (error) {
    console.error("❌ ERROR DURING FIX:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllMemberDates();
