import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "video not found");
  }
  const options = {
    page,
    limit,
  };

  const comments = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "createdBy",
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
        $createdBy: {
          $first: "$createdBy",
        },
      },
    },
    {
      $unwind: "$createdBy",
    },
    {
      $project: {
        content: 1,
        createdBy: 1,
      },
    },
    {
      $limit: parseInt(limit),
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, comments, "comments fetched successfully"));
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const { videoId } = req.params;
  const user = req.user._id;
  const { content } = req.body;
  if (!content) {
    throw new ApiError(400, "comment content cannot be empty");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(400, "video not found");
  }
  const comment = await Comment.create({
    content,
    video: videoId,
    owner: user,
  });

  if (!comment) {
    throw new ApiError(400, "Error while commenting on the video");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "comment done successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content) {
    throw new ApiError(400, "content is missing");
  }
  const { commentId } = req.params;
  const { user } = req.user._id;
  const originalComment = await Comment.findById(commentId);
  if (!originalComment) {
    throw new ApiError(404, "orginal comment is missing");
  }

  if (originalComment.owner !== user) {
    throw new ApiError(403, "you don't have the access to change the comment");
  }
  const updateComment = await Comment.findByIdAndUpdate(
    commentId,
    {
      $set: {
        content,
      },
    },
    { new: true }
  );
  if (!updateComment) {
    throw new ApiError(500, "error while updating the comment");
  }
  return res
    .status(200)
    .json(200, updateComment, "Successfully updated the comment");
});

const deleteComment = asyncHandler(async (req, res) => {
  const user = req.user._id;
  const { commentId } = req.params;
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "comment not found");
  }
  if (comment.owner !== user) {
    throw new ApiError(
      403,
      "You dont have the permission to delete this comment"
    );
  }
  const deleteComment = await Comment.findByIdAndDelete(commentId);
  if (!deleteComment) {
    throw new ApiError(500, "Error while deleting the comment");
  }
  return res
    .status(200)
    .json(new ApiError(200, deleteComment, "successfully deleted the comment"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
