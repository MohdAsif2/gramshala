// models/Video.js
import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    videoUrl: String,
    audioUrl: String,
    transcript: {
      text: String,
      segments: [
        {
          start: Number,
          end: Number,
          text: String,
        },
      ],
    },
    transcriptStatus: {
      type: String,
      enum: ["pending", "processing", "done", "failed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Video", videoSchema);