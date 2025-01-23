import mongoose, { Mongoose } from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const videoCount = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $group: {
        _id: "$videoFile",
        totalViews: {
          $sum: "$views",
        },
        totalVideos: {
          $sum: 1,
        },
      },
    },
    {
      $project: {
        totalViews: 1,
        totalVideos: 1,
      },
    },
  ]);
  const subsCount = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $group: {
        _id: null,
        totalSubscribers: {
          $sum: 1,
        },
      },
    },
    {
      $project: {
        totalSubscribers: 1,
      },
    },
  ]);
  const likeCount = await Like.aggregate([
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "videoInfo",
      },
    },
    {
      $lookup: {
        from: "comments",
        localField: "comment",
        foreignField: "_id",
        as: "commentInfo",
      },
    },
    {
      $lookup: {
        from: "tweets",
        localField: "tweet",
        foreignField: "_id",
        as: "tweetInfo",
      },
    },
    {
      $match: {
        $or: [
          {
            "videoInfo.owner": userId,
          },
          {
            "tweetInfo.owner": userId,
          },
          {
            "commentInfo.owner": userId,
          },
        ],
      },
    },
    {
      $group: {
        _id: null,
        totalLikes:{$sum:1},
      },
    },
  ]);
  const info = {
    totalViews: videoCount[0]?.totalViews || 0,
    totalVideos: videoCount[0]?.totalVideos || 0,
    totalSubscribers: subsCount[0]?.totalSubscribers || 0,
    totalLikes: likeCount[0]?.totalLikes || 0,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, info, "Channel stats Fetched"));
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const videos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $project: {
        videoFile: 1,
        thumbnail: 1,
        owner: 1,
        title: 1,
        duration: 1,
        views: 1,
        isPublished: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);
  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Channel Videos fetched"));
});

export { getChannelStats, getChannelVideos };
