import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(400, "no such video exist");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Successfully got the video"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }
  const { title, description } = req.body;
  const newThumbnaiLocalPath = req.file?.path;
  if (!(title || description)) {
    throw new ApiError(400, "Please give updated details");
  }
  if (!newThumbnaiLocalPath) {
    throw new ApiError(400, "Updated thumbnail not provided");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(400, "No video found ");
  }
  if (video.owner !== req.user._id) {
    throw new ApiError(
      400,
      "You have not the permission to update the video details"
    );
  }

  const deleteThumbnail = await deleteFromCloudinary(video.thumbnail);
  if (deleteThumbnail.result !== "ok") {
    throw new ApiError(500, "error while deleting the thumbnail");
  }
  const newThumbnail = await uploadOnCloudinary(newThumbnaiLocalPath);
  if (!newThumbnail.url) {
    throw new ApiError(500, "Error while uploading the new thumbnail");
  }

  const updateVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumbnail: newThumbnail.url,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updateVideo, "video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video Id");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(400, "video not found");
  }
  if (video.owner !== req.user._id) {
    throw new ApiError(400, "You have not the permission to delete the video");
  }
  const cloudinaryDeleteVideoResponse = await deleteFromCloudinary(
    video.videoFile
  );
  if (cloudinaryDeleteVideoResponse.result !== "ok") {
    throw new ApiError(
      500,
      "Error while deleting the videoFile from cloudinary"
    );
  }
  const cloudinaryDeleteThumbnailResponse = await deleteFromCloudinary(
    video.thumbnail
  );
  if (cloudinaryDeleteThumbnailResponse.result !== "ok") {
    throw new ApiError(
      500,
      "Error while deleting the thumbanail from cloudinary"
    );
  }
  const deleteVideo = await Video.findByIdAndDelete(videoId);
  if (!deleteVideo) {
    throw new ApiError(500, "Error while deleting the video");
  }
  return res.status(200).json(new ApiResponse(200, {}, "video deleted"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) {
    throw new ApiError(400, "Invalid videoId");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(400, "video not found");
  }
  if (video.owner !== req.user._id) {
    throw new ApiError(
      400,
      "you are not allowed to change the publish status of this video"
    );
  }

  const modifyPublishVideoStatus = await Video.findByIdAndUpdate(
    video,
    {
      $set: {
        isPublished: !video.isPublished,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(new ApiError(200, modifyPublishVideoStatus, "video status modified"));
});

const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query = " ",
    sortBy,
    sortType,
    userId,
  } = req.query;
  const videos = await Video.aggregate([
    {
      $match: {
        $or: [
          {
            title: {
              $regex: query,
              $options: "i",
            },
          },
          {
            description: {
              $regex: query,
              $options: "i",
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "createdBy",
      },
    },
    {
      $unwind: "$createdBy",
    },
    {
      $project: {
        thumbnail: 1,
        title: 1,
        description: 1,
        videoFile: 1,
        createdBy: {
          fullName: 1,
          username: 1,
          avatar: 1,
        },
      },
    },
    {
      $sort: {
        [sortBy]: sortType === "asc" ? 1 : -1,
      },
    },
    {
      $skip: (page - 1) * limit, //Page 1: Returns documents 1–10. Page 2: Returns documents 11–20. Page 3: Returns documents 21–30, and so on.
    },
    {
      $limit: parseInt(limit),
    },
  ]);
  return res
    .status(200)
    .json(new ApiResponse(200, videos, "fetched all videos"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video
  if (!(title || description)) {
    throw new ApiError(400, "all details are required");
  }
  const videoLocalFilePath = req.files?.videoFile[0].path;
  if (!videoLocalFilePath) {
    throw new ApiError(400, "No video file found");
  }
  const videoFile = await uploadOnCloudinary(videoLocalFilePath);
  if (videoFile.url) {
    throw new ApiError(500, "Error while uploading the file on cloudinary");
  }

  const thumbnailLocalPath = req.files?.thumbnail[0].path;
  if (!thumbnailLocalPath) {
    throw new ApiError(500, "No thumbnail file found");
  }

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (thumbnail.url) {
    throw new ApiError(400, "Error while uploading thumbnail file");
  }

  const video = await Video.create({
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    title,
    description,
    owner: req.user._id,
    duration: videoFile.duration,
  });
  if (!video) {
    throw new ApiError(400, "Error while creating the video");
  }
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus
}
