import { NextResponse } from "next/server";
import connectDB from "@/lib/db";

export async function GET() {
  try {
    await connectDB();
    return NextResponse.json({
      success: true,
      message: "Successfully connected to MongoDB Atlas!",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to connect to MongoDB Atlas",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
