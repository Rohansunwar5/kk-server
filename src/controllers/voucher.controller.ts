import { Request, Response } from 'express';
import voucherService from '../services/voucher.service';

export const createVoucher = async (req: Request, res: Response) => {
    const voucher = await voucherService.createVoucher(req.body);
    
    res.status(201).json({
        success: true,
        message: 'Voucher created successfully',
        data: voucher
    });
};

export const updateVoucher = async (req: Request, res: Response) => {
    const { id } = req.params;
    const voucher = await voucherService.updateVoucher(id, req.body);
    
    res.status(200).json({
        success: true,
        message: 'Voucher updated successfully',
        data: voucher
    });
};

export const getVoucherById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const voucher = await voucherService.getVoucherById(id);
    
    res.status(200).json({
        success: true,
        data: voucher
    });
};

export const getVoucherByCode = async (req: Request, res: Response) => {
    const { code } = req.params;
    const voucher = await voucherService.getVoucherByCode(code);
    
    res.status(200).json({
        success: true,
        data: voucher
    });
};

export const getAvailableVouchers = async (req: Request, res: Response) => {
    const vouchers = await voucherService.getAvailableVouchers();
    
    res.status(200).json({
        success: true,
        data: vouchers
    });
};

export const getAllVouchers = async (req: Request, res: Response) => {
    const { page, limit, used, searchTerm } = req.query;
    
    const result = await voucherService.getAllVouchers({
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        used: used === 'true' ? true : used === 'false' ? false : undefined,
        searchTerm: searchTerm as string
    });
    
    res.status(200).json({
        success: true,
        data: result
    });
};

export const applyVoucher = async (req: Request, res: Response) => {
    const { code, subtotal } = req.body;
    
    const result = await voucherService.applyVoucher({
        code,
        subtotal
    });
    
    res.status(200).json({
        success: true,
        message: 'Voucher applied successfully',
        data: result
    });
};

export const markVoucherAsUsed = async (req: Request, res: Response) => {
    const { code } = req.body;
    const userId = (req as any).user._id;
    
    const voucher = await voucherService.markVoucherAsUsed(code, userId);
    
    res.status(200).json({
        success: true,
        message: 'Voucher marked as used successfully',
        data: voucher
    });
};

export const deleteVoucher = async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await voucherService.deleteVoucher(id);
    
    res.status(200).json({
        success: true,
        message: result.message
    });
};

export const getExpiredVouchers = async (req: Request, res: Response) => {
    const { page, limit } = req.query;
    
    const result = await voucherService.getExpiredVouchers(
        page ? parseInt(page as string) : 1,
        limit ? parseInt(limit as string) : 10
    );
    
    res.status(200).json({
        success: true,
        data: result
    });
};

export const getVoucherStats = async (req: Request, res: Response) => {
    const stats = await voucherService.getVoucherStats();
    
    res.status(200).json({
        success: true,
        data: stats
    });
};