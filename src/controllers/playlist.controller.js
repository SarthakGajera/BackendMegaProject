import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!(name || description)) {
    throw new ApiError(400, "name and description is missing");
  }
  const existingPlaylist = await Playlist.findOne({
    $and: [{ name: name }, { owner: req.user._id }]
  });
  if (existingPlaylist) {
    throw new ApiError(400, "Playlist with existing details already exists");
  }
  const playlist = await Playlist.create({
    name,
    description,
    owner: req.user._id
  });
  if (!playlist) {
    throw new ApiError(500, "Error while creating playlist");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist Created"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user Id");
  }
  const userPlaylists = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId)
      }
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
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
                    fullName: 1,
                    username: 1,
                    avatar: 1
                  }
                }
              ]
            }
          },
          {
            $addFields: {
              owner: {
                $first: "$owner"
              }
            }
          },
          {
            $project: {
              title: 1,
              thumbnail: 1,
              description: 1,
              owner: 1
            }
          }
        ]
      }
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
              avatar: 1,
              fullName: 1,
              username: 1
            }
          }
        ]
      }
    },
    {
      $addFields: {
        createdBy: {
          $first: "$createdBy"
        }
      }
    },
    {
      $project: {
        videos: 1,
        createdBy: 1,
        name: 1,
        description: 1
      }
    }
  ]);
  if (!userPlaylists.length) {
    throw new ApiError(400, "No playlist found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, userPlaylists, "Playlists fetched"));
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID");
  }
  const playlist = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId)
      }
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
              fullName: 1,
              username: 1,
              avatar: 1
            }
          }
        ]
      }
    },
    {
      $addFields: {
        createdBy: {
          $first: "$createdBy"
        }
      }
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
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
                    fullName: 1,
                    username: 1,
                    avatar: 1
                  }
                }
              ]
            }
          },
          {
            $addFields: {
              owner: {
                $first: "$owner"
              }
            }
          },
          {
            $project: {
              thumbnail: 1,
              title: 1,
              duration: 1,
              views: 1,
              owner: 1,
              createdAt: 1,
              updatedAt: 1
            }
          }
        ]
      }
    },
    {
      $project: {
        videos: 1,
        description: 1,
        name: 1,
        createdBy: 1
      }
    }
  ]);

  if (!playlist) {
    throw new ApiError(500, "Error fetching playlist");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist Fetched"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid playlist and video ID");
  }
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(400, "playlist does not exist");
  }
  if (!playlist.owner.equals(req.user._id)) {
    throw new ApiError(400, "You are not allowed to modify this playlist");
  }

  const videoExists = playlist.videos.filter(
    (video) => video.toString() === videoId
  );
  if (videoExists.length > 0) {
    throw new ApiError(400, "video already exists in the playlist");
  }

  const addVideo = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $push: { videos: videoId }
    },
    {
      new: true
    }
  );
  if (!addVideo) {
    throw new ApiError(500, "Error while adding this video to playlist");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, addVideo, "Video added to the playlist"));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid playlist id and video id");
  }
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(400, "Playlist is not available");
  }
  if (!playlist.owner.equals(req.user._id)) {
    throw new ApiError(403, "You are not allowed to modify this playlist");
  }
  const videoExist = playlist.videos.find(
    (video) => video.toString() === videoId
  );
  if (!videoExist) {
    throw new ApiError(400, "no video found with the given id in the playlist");
  }
  const modifiedPlaylistVideos = playlist.videos.filter(
    (video) => video.toString() !== videoId
  );
  const removeVideo = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $set: {
        videos: modifiedPlaylistVideos
      }
    },
    { new: true }
  );
  if (!removeVideo) {
    throw new ApiError(500, "Error while removing the video");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, removeVideo, "Video removed from playlist"));
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  // TODO: delete playlist
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id");
  }
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(400, "Playlist not found");
  }
  if (!playlist.owner.equals(req.user._id)) {
    throw new ApiError(400, "You are not allowed to delete this playlist");
  }
  const deletePlaylist = await Playlist.findByIdAndDelete(playlistId);
  if (!deletePlaylist) {
    throw new ApiError(500, "Error while deleting the playlist");
  }
  return res.status(200).json(new ApiResponse(200, {}, "Playlist deleted"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  //TODO: update playlist
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist Id");
  }
  if (!name || !description) {
    throw new ApiError(400, "All fields are required");
  }
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(400, "playlist does not exist");
  }
  if (!playlist.owner.equals(req.user._id)) {
    throw new ApiError(400, "You are not allowed to modify this playlist");
  }
  const updatePlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $set: {
        name,
        description
      }
    },
    {
      new: true
    }
  );
  if (!updatePlaylist) {
    throw new ApiError(500, "error while updating this playlist");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, updatePlaylist, "Playlist updated"));
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist
};
