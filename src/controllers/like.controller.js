import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video Id");
  }
  const user = req.user._id;
  const likedVideo = await Like.findOne({
    $and: [{ video: videoId }, { likedBy: user }],
  });
  if (!likedVideo) {
    const like = await Like.create({
      video: videoId,
      likedBy: user,
    });
    if (!like) {
      throw new ApiError(400, "Error while liking the video");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, like, "video liked successfully"));
  }

  const unlikeVideo = await Like.findByIdAndDelete(likedVideo._id);
  if (!unlikeVideo) {
    throw new ApiError(400, "Error while unliking the video");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, unlikeVideo, "Successfully unliked the video"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }
  const user = req.user._id;

  const likedComment = await Like.findOne({
    $and: [{ comment: commentId }, { likedBy: user }],
  });

  if (!likedComment) {
    const like = await Like.create({
      comment: commentId,
      likedBy: user,
    });
    if (!like) {
      throw new ApiError(400, "Error while liking the comment");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, like, "comment liked successfully"));
  }

  const unlikeComment = await Like.findByIdAndDelete(likedComment._id);
  if (!unlikeComment) {
    throw new ApiError(200, "error while unliking the comment");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, unlikeComment, "Successfully unliked the comment")
    );
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "invalid tweet id");
  }
  const user = req.user._id;

  const likedTweet = await Like.findOne({
    $and: [{ tweet: tweetId }, { likedBy: user }],
  });

  if (!likedTweet) {
    const like = await Like.create({
      tweet: tweetId,
      likedBy: user,
    });
    if (!like) {
      throw new ApiError(400, "Error while like the tweet");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, like, "tweet liked successfully"));
  }

  const unlikeTweet = await Like.findByIdAndDelete(likedTweet._id);
  if (!unlikeTweet) {
    throw new ApiError(400, "Error while unlike tweet");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, unlikeTweet, "Successfully unliked the Tweet"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user._id),
        video: { $exists: true, $ne: null },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",

              pipeline: [
                {
                  $project: {
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
          {
            $project: {
              videoFile: 1,
              thumbnail: 1,
              title: 1,
              duration: 1,
              views: 1,
              owner: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$video",
    },
    {
      $project: {
        video: 1,
        likedBy: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "Successfully fetched liked videos")
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
